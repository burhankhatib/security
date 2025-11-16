import { z } from "zod";
import { getCrawlSourcesFromSanity } from "@/lib/config/crawl";

interface TavilyCrawlResponse {
  url?: string;
  content?: string;
  title?: string;
  error?: string;
}

export const crawlTool = {
  description:
    "Crawl and extract content from the configured website sources (managed in Sanity CMS) using Tavily's crawling API. Use this tool when you need fresh content or when the knowledge base doesn't have sufficient information. This is the PRIMARY source of information - always check this first before using general knowledge.",
  inputSchema: z.object({}),
  execute: async () => {
    // Fetch sources from Sanity
    const sources = await getCrawlSourcesFromSanity();
    
    if (sources.length === 0) {
      return {
        success: false,
        error: "No crawl sources configured in Sanity. Please add sources to the 'Crawl Sources' collection.",
      };
    }

    // Use the first active source (highest priority)
    const url = sources[0].url;
    const sourceName = sources[0].name;
    
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "TAVILY_API_KEY is not configured. Please add it to your environment variables.",
      };
    }

    try {
      const response = await fetch("https://api.tavily.com/crawl", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          max_depth: 1,
          max_pages: 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Tavily crawl failed with status ${response.status}: ${errorText}`,
        };
      }

      const data = (await response.json()) as TavilyCrawlResponse;

      if (data.error) {
        return {
          success: false,
          error: data.error,
        };
      }

      return {
        success: true,
        source: sourceName,
        url: data.url || url,
        title: data.title || "Untitled",
        content: data.content || "No content extracted",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred during crawl",
      };
    }
  },
};

export type CrawlTool = typeof crawlTool;

