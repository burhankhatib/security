import { NextResponse } from "next/server";
import { convertToModelMessages, streamText } from "ai";
import type { UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

import { retrieveRelevantChunks, retrieveCrawledChunks } from "@/lib/knowledge/vector";
import { fetchLatestSystemPrompt } from "@/lib/prompts/systemPrompt";
import type { SystemPromptDocument } from "@/lib/prompts/systemPrompt";
import { crawlTool } from "@/lib/tools/crawl";
import { separateCrawledChunks, hasRelevantCrawledContent } from "@/lib/knowledge/crawled";

type ResponseBadgeType = "systemPrompt" | "knowledge";

interface ResponseBadge {
  type: ResponseBadgeType;
  label: string;
  href: string;
  tooltip?: string;
}

type ChatRequestBody = {
  messages?: Array<unknown>;
};

const DEFAULT_SYSTEM_PROMPT = `
You are Sentinel, a calm and professional cybersecurity guide. 
Explain complex concepts with clarity, keep recommendations actionable, and focus on web application and infrastructure hardening. 
When asked for steps, provide concise checklists. 
If a question is outside cybersecurity, answer briefly before steering the user back to security topics.
You are a helpful assistant that can answer questions and help with tasks.

CRITICAL INSTRUCTIONS FOR ANSWERING:
1. 🚨 CRAWLED CONTENT IS YOUR PRIMARY AND EXCLUSIVE SOURCE 🚨
2. ALWAYS check crawled content FIRST before using any general knowledge
3. If crawled content contains ANY relevant information (even partial), you MUST use ONLY that information
4. Do NOT suggest alternative interpretations, common uses, or general knowledge if crawled content exists
5. Answer based SOLELY on the crawled content when it's available
6. Only if crawled content has ABSOLUTELY NO relevant information, you may say: "I couldn't find specific information about this in the available content. Based on general knowledge..."
7. NEVER mention the source website URL, domain name, or any identifying information
8. When referencing crawled content, speak as if it's internal knowledge without citing sources
9. Do NOT confuse the user with unrelated general knowledge when crawled content exists
`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY environment variable. Set it in your .env.local file.",
      },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid JSON payload in request body.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      {
        error: "Request body must include a non-empty messages array.",
      },
      { status: 400 }
    );
  }

  let modelMessages;
  try {
    if (!isUIMessageArray(body.messages)) {
      return NextResponse.json(
        {
          error: "Invalid message payload. Expected UI message structure.",
        },
        { status: 400 }
      );
    }

    modelMessages = convertToModelMessages(body.messages);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to convert UI messages for the language model.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  let baseSystemPrompt = DEFAULT_SYSTEM_PROMPT;
  const badges: ResponseBadge[] = [];
  let systemPromptInfo: SystemPromptDocument | null = null;
  const knowledgeDocs: Array<{ title: string; slug: string }> = [];

  try {
    const latestPrompt = await fetchLatestSystemPrompt();
    if (latestPrompt) {
      baseSystemPrompt = latestPrompt.prompt;
      systemPromptInfo = latestPrompt;
    }
  } catch (promptError) {
    console.error("Failed to load system prompt", promptError);
  }

  let augmentedSystemPrompt = baseSystemPrompt;

  try {
    const queryText = extractLatestUserText(modelMessages);
    if (queryText) {
      // First, try to get crawled content (priority source) - get more chunks for better coverage
      const crawledChunks = await retrieveCrawledChunks(queryText, 15);
      const { crawled } = separateCrawledChunks(crawledChunks);
      
      console.log(`[Agent] Retrieved ${crawled.length} crawled chunks for query: "${queryText}"`);

      if (hasRelevantCrawledContent(crawled)) {
        // Use crawled content as primary source
        console.log(`[Agent] Using ${crawled.length} crawled chunks for query: "${queryText}"`)
        const context = crawled
          .map((chunk, idx) => {
            return `[Chunk ${idx + 1}]\n${chunk.content}`;
          })
          .join("\n\n---\n\n");

        augmentedSystemPrompt = `${baseSystemPrompt}\n\n🚨 CRITICAL INSTRUCTIONS - CRAWLED CONTENT IS PRIMARY AND EXCLUSIVE SOURCE 🚨\n\nYou have been provided with crawled content from a specific website. This is your ONLY source of information.\n\nSTRICT RULES:\n1. Search through the crawled content below for information related to the query\n2. If you find ANY relevant information in the crawled content, answer ONLY using that information\n3. DO NOT mix crawled content with general knowledge\n4. DO NOT suggest alternative interpretations from outside sources\n5. DO NOT mention where the content came from or that it's crawled\n\n6. If the crawled content has NO relevant information, you MUST respond EXACTLY as follows:\n   "I couldn't find specific information about [topic] in the available content. Would you like me to search other sources and use general knowledge to answer your question?"\n\n7. Wait for user confirmation before providing any answer from general knowledge\n8. NEVER provide general knowledge answers without explicit user permission\n\nCRAWLED CONTENT:\n${context}\n\nRemember: Use ONLY the crawled content above. If it doesn't have the answer, ask the user for permission to use other sources.`;

        // Add knowledge docs for tracking
        const uniqueDocs = new Map<string, { title: string; slug: string }>();
        crawled.forEach((chunk) => {
          if (!uniqueDocs.has(chunk.slug)) {
            uniqueDocs.set(chunk.slug, { title: chunk.docTitle, slug: chunk.slug });
          }
        });
        const docList = Array.from(uniqueDocs.values());
        knowledgeDocs.splice(0, knowledgeDocs.length, ...docList);
      } else {
        // No crawled content found - inform user to populate knowledge base
        console.log(`[Agent] No crawled content found in knowledge base - instructing user to refresh`)
        augmentedSystemPrompt = `${baseSystemPrompt}\n\n⚠️ IMPORTANT: No crawled content is available in the knowledge base.\n\nYou MUST inform the user:\n"The knowledge base is empty. Please click the '↻ Refresh' button at the top to crawl the website and populate the knowledge base with content. Once the crawl completes, you'll see 'Ready (X chunks)' and I'll be able to answer questions based on the website content."\n\nDO NOT attempt to answer their question using general knowledge. Direct them to populate the knowledge base first.`;
      }
    }
  } catch (contextError) {
    console.error("Knowledge retrieval failed", contextError);
  }

  if (systemPromptInfo) {
    badges.push({
      type: "systemPrompt",
      label: systemPromptInfo.title || "System Prompt",
      href: "/studio",
      tooltip: `Response shaped by CMS system prompt (updated ${new Date(systemPromptInfo.updatedAt).toLocaleString()})`,
    });
  }

  try {
    const result = streamText({
      model: openai("gpt-5-mini"),
      system: augmentedSystemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1200,
      tools: {
        crawl: crawlTool,
      },
    });

    const metadata =
      systemPromptInfo || knowledgeDocs.length > 0 || badges.length > 0
        ? {
            badges,
            systemPrompt: systemPromptInfo
              ? {
                  title: systemPromptInfo.title,
                  updatedAt: systemPromptInfo.updatedAt,
                }
              : undefined,
            knowledgeDocs: knowledgeDocs.length > 0 ? knowledgeDocs : undefined,
          }
        : undefined;

    const headers: Record<string, string> = {
      "x-agent-model": "gpt-5-mini",
      "x-system-prompt-source": systemPromptInfo ? "sanity" : "default",
    };

    if (systemPromptInfo) {
      headers["x-system-prompt-title"] = encodeURIComponent(systemPromptInfo.title);
    }

    if (knowledgeDocs.length > 0) {
      headers["x-knowledge-doc-count"] = String(knowledgeDocs.length);
    }

    return result.toUIMessageStreamResponse({
      headers,
      messageMetadata: () => metadata,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate a response from the agent.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function extractLatestUserText(messages: unknown[]): string | null {
  const reversed = [...messages].reverse();
  for (const message of reversed) {
    if (
      typeof message === "object" &&
      message !== null &&
      "role" in message &&
      (message as { role: string }).role === "user"
    ) {
      if (!("content" in message)) {
        continue;
      }

      const content = (message as { content: unknown }).content;
      if (typeof content === "string") {
        return content;
      }

      if (Array.isArray(content)) {
        return content
          .map((part) => {
            if (
              typeof part === "object" &&
              part !== null &&
              "type" in part &&
              (part as { type: string }).type === "text" &&
              "text" in part
            ) {
              return String((part as { text: unknown }).text ?? "");
            }
            return "";
          })
          .filter(Boolean)
          .join(" ")
          .trim();
      }
    }
  }

  return null;
}

function isUIMessageArray(messages: unknown): messages is UIMessage[] {
  return (
    Array.isArray(messages) &&
    messages.every((message) => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as { role?: unknown; parts?: unknown };
      if (typeof candidate.role !== "string") return false;
      if (!Array.isArray(candidate.parts)) return false;
      return true;
    })
  );
}

