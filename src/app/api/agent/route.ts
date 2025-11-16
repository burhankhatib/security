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

        augmentedSystemPrompt = `${baseSystemPrompt}\n\n🚨 CRITICAL INSTRUCTIONS - CRAWLED CONTENT IS PRIMARY SOURCE 🚨\n\nYou have been provided with crawled content from the website. This content MUST be your PRIMARY and ONLY source for answering the user's question.\n\nRULES:\n1. ALWAYS search through the crawled content FIRST before using any general knowledge\n2. If the crawled content contains ANY information related to the query (even partial), you MUST use ONLY that information\n3. Do NOT suggest alternative interpretations or general knowledge if crawled content exists\n4. Do NOT mention where the content came from\n5. Answer based SOLELY on the crawled content provided below\n6. Only if the crawled content has ABSOLUTELY NO relevant information should you say: "I couldn't find specific information about this in the available content. Based on general knowledge..."\n\nCRAWLED CONTENT:\n${context}\n\nRemember: The crawled content above is your PRIMARY source. Use it exclusively when it contains relevant information.`;

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
        // Fallback to other knowledge sources if no crawled content
        const allChunks = await retrieveRelevantChunks(queryText, 4);
        if (allChunks.length > 0) {
          const docMap = new Map<string, { title: string; slug: string }>();
          const context = allChunks
            .map((chunk) => {
              docMap.set(chunk.slug, { title: chunk.docTitle, slug: chunk.slug });
              return `Title: ${chunk.docTitle}
Priority: ${chunk.importance}
Excerpt: ${chunk.content}`;
            })
            .join("\n\n---\n\n");

          const docList = Array.from(docMap.values());
          knowledgeDocs.splice(0, knowledgeDocs.length, ...docList);
          const tooltip = docList.map((doc) => doc.title).join(", ");

          if (docList.length > 0) {
            badges.push({
              type: "knowledge",
              label: docList.length > 1 ? `Knowledge Base (${docList.length})` : docList[0].title,
              href: "/knowledge/knowledge-base.json",
              tooltip: tooltip || undefined,
            });
          }

          augmentedSystemPrompt = `${baseSystemPrompt}\n\nSECONDARY SOURCE - GENERAL KNOWLEDGE:\nThe following knowledge base excerpts may be relevant. Use them if they help answer the question. Do not mention the knowledge base or cite the excerpts explicitly.\n\n${context}\n\nNote: If this content does not contain sufficient information, you may use your general knowledge but must first state: "I couldn't find specific information about this in the available content. Based on general knowledge..."`;
        } else {
          // No content found at all - use general knowledge with disclaimer
          augmentedSystemPrompt = `${baseSystemPrompt}\n\nIMPORTANT: No relevant content was found in the knowledge base. You may use your general knowledge to answer, but you must first state: "I couldn't find specific information about this in the available content. Based on general knowledge..."`;
        }
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

