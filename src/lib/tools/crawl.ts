import { z } from "zod";
import { getCrawlSourceUrl } from "@/lib/config/crawl";

interface TavilyCrawlResponse {
  url?: string;
  content?: string;
  title?: string;
  error?: string;
}

export const crawlTool = {
  description:
    "Crawl and extract content from the configured primary website source using Tavily's crawling API. Use this tool when you need fresh content or when the knowledge base doesn't have sufficient information. This is the PRIMARY source of information - always check this first before using general knowledge.",
  inputSchema: z.object({}),
  execute: async () => {
    const url = getCrawlSourceUrl();
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

