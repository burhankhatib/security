import { NextResponse } from "next/server";
import { z } from "zod";
import { addCrawledContentToKnowledge } from "@/lib/knowledge/crawl";
import { getCrawlSourceUrl } from "@/lib/config/crawl";
import {
  isCrawlCacheValid,
  saveCacheMetadata,
  loadCacheMetadata,
  getCacheAgeMinutes,
} from "@/lib/knowledge/cache";

const crawlRequestSchema = z.object({
  addToKnowledge: z.boolean().optional().default(true),
  // Optional override URL for admin testing (defaults to configured source)
  url: z.string().url().optional(),
  // Force refresh even if cache is valid
  forceRefresh: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "TAVILY_API_KEY is not configured. Add it to your environment variables.",
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid JSON payload in request body.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const validationResult = crawlRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: validationResult.error.errors,
      },
      { status: 400 }
    );
  }

  // Use provided URL or fall back to configured source
  const url = validationResult.data.url || getCrawlSourceUrl();
  const forceRefresh = validationResult.data.forceRefresh || false;

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && (await isCrawlCacheValid())) {
    const cacheMetadata = await loadCacheMetadata();
    const ageMinutes = await getCacheAgeMinutes();

    return NextResponse.json({
      success: true,
      cached: true,
      url: cacheMetadata?.url || url,
      message: `Using cached crawl data (${ageMinutes} minutes old). Cache refreshes every hour.`,
      cacheAgeMinutes: ageMinutes,
      lastCrawledAt: cacheMetadata?.lastCrawledAt,
      chunksAdded: cacheMetadata?.chunksAdded || 0,
    });
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
        max_depth: 3,
        max_pages: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Tavily crawl failed with status ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const rawData = await response.json();
    console.log("Tavily crawl response structure:", {
      hasPages: Array.isArray(rawData.pages),
      pagesCount: rawData.pages?.length || 0,
      hasContent: !!rawData.content,
      hasResults: Array.isArray(rawData.results),
      keys: Object.keys(rawData),
      firstPageSample: rawData.pages?.[0] ? Object.keys(rawData.pages[0]) : null,
    });

    // Tavily crawl API returns different formats - handle all possible structures
    let crawlData: {
      url?: string;
      content?: string;
      title?: string;
      pages?: Array<{ url: string; content: string; title?: string }>;
    };

    // Check if response has 'results' array (Tavily search format)
    if (Array.isArray(rawData.results)) {
      const results = rawData.results as Array<{
        url?: string;
        content?: string;
        title?: string;
        text?: string;
        body?: string;
      }>;
      crawlData = {
        url: rawData.url || url,
        title: rawData.title || "Crawled Content",
        content: results.map((r) => r.content || r.text || r.body || "").join("\n\n"),
        pages: results.map((r) => ({
          url: r.url || url,
          content: r.content || r.text || r.body || "",
          title: r.title || "Untitled Page",
        })),
      };
    } else if (rawData.pages && Array.isArray(rawData.pages)) {
      // Direct crawl format with pages array - extract content from various possible fields
      const processedPages = rawData.pages.map((page: {
        url?: string;
        link?: string;
        content?: string;
        text?: string;
        body?: string;
        markdown?: string;
        html?: string;
        title?: string;
        name?: string;
        [key: string]: unknown;
      }) => {
        // Try multiple possible content fields
        const content = 
          page.content || 
          page.text || 
          page.body || 
          page.markdown ||
          page.html ||
          (typeof page === 'string' ? page : JSON.stringify(page));
        
        return {
          url: page.url || page.link || url,
          content: typeof content === 'string' ? content : '',
          title: page.title || page.name || "Untitled Page",
        };
      });

      crawlData = {
        url: rawData.url || url,
        title: rawData.title || "Crawled Content",
        content: rawData.content || rawData.text || rawData.body || processedPages.map((p: { content: string }) => p.content).join("\n\n"),
        pages: processedPages,
      };
    } else if (rawData.content || rawData.text || rawData.body) {
      // Single page content
      crawlData = {
        url: rawData.url || url,
        title: rawData.title || "Untitled",
        content: rawData.content || rawData.text || rawData.body || "",
        pages: [],
      };
    } else {
      // Fallback: try to extract any text content
      const fallbackContent = rawData.markdown || rawData.html || JSON.stringify(rawData);
      crawlData = {
        url: rawData.url || url,
        title: rawData.title || "Untitled",
        content: fallbackContent,
        pages: [],
      };
    }
    
    // Log what we extracted
    console.log("Extracted crawl data:", {
      url: crawlData.url,
      mainContentLength: crawlData.content?.length || 0,
      pagesCount: crawlData.pages?.length || 0,
      firstPageContentLength: crawlData.pages?.[0]?.content?.length || 0,
      firstPageUrl: crawlData.pages?.[0]?.url,
    });

    const result = {
      success: true,
      url: crawlData.url || url,
      title: crawlData.title || "Untitled",
      content: crawlData.content || "",
      pages: crawlData.pages || [],
      pageCount: crawlData.pages?.length || 0,
    };

    console.log("Processed crawl result:", {
      url: result.url,
      contentLength: result.content.length,
      pageCount: result.pageCount,
    });

    // Add to knowledge base if requested
    if (validationResult.data.addToKnowledge) {
      // Clear old crawled content before adding new (prevent duplicates)
      const { clearCrawledContent } = await import("@/lib/knowledge/crawl");
      const clearResult = await clearCrawledContent();

      let totalChunksAdded = 0;
      const errors: string[] = [];
      const crawledAt = new Date().toISOString();

      // Process main page content if available (lower threshold to 20 chars)
      if (crawlData.content && crawlData.content.trim().length > 20) {
        console.log(`Processing main page: ${result.url}, content length: ${crawlData.content.length}`);
        const mainResult = await addCrawledContentToKnowledge({
          url: result.url,
          title: result.title,
          content: crawlData.content,
          crawledAt,
        });

        console.log(`Main page result:`, mainResult);

        if (mainResult.success) {
          totalChunksAdded += mainResult.chunksAdded;
        } else if (mainResult.error) {
          errors.push(`Main page: ${mainResult.error}`);
        }
      } else {
        console.warn(`Main page content too short or missing: ${crawlData.content?.length || 0} chars, preview: "${crawlData.content?.substring(0, 200)}"`);
      }

      // Process all crawled pages
      if (crawlData.pages && crawlData.pages.length > 0) {
        console.log(`Processing ${crawlData.pages.length} pages`);
        let pagesWithContent = 0;
        
        for (let i = 0; i < crawlData.pages.length; i++) {
          const page = crawlData.pages[i];
          
          // Log page structure for debugging
          if (i < 3) {
            console.log(`Page ${i + 1} structure:`, {
              url: page.url,
              title: page.title,
              contentLength: page.content?.length || 0,
              contentPreview: page.content?.substring(0, 200) || 'NO CONTENT',
            });
          }
          
          // Lower threshold to 20 chars - some pages might have minimal but useful content
          if (page.content && page.content.trim().length > 20) {
            pagesWithContent++;
            console.log(`Processing page ${i + 1}/${crawlData.pages.length}: ${page.url || 'unknown'}, content length: ${page.content.length}`);
            
            const pageResult = await addCrawledContentToKnowledge({
              url: page.url || result.url,
              title: page.title || "Untitled Page",
              content: page.content,
              crawledAt,
            });

            if (pageResult.success) {
              totalChunksAdded += pageResult.chunksAdded;
              console.log(`Page ${i + 1} added ${pageResult.chunksAdded} chunks`);
            } else if (pageResult.error) {
              errors.push(`Page ${page.url}: ${pageResult.error}`);
              console.error(`Page ${i + 1} error:`, pageResult.error);
            }
          } else {
            if (i < 10) {
              console.warn(`Skipping page ${i + 1} (${page.url}) - content too short: ${page.content?.length || 0} chars, preview: "${page.content?.substring(0, 100)}"`);
            }
          }
        }
        
        console.log(`Summary: ${pagesWithContent}/${crawlData.pages.length} pages had sufficient content`);
      } else {
        console.warn("No pages array found in crawl response");
      }

      console.log(`Total chunks added: ${totalChunksAdded}, Errors: ${errors.length}`);

      // If no content was extracted, try using Tavily search API as fallback
      if (totalChunksAdded === 0 && !validationResult.data.url) {
        console.log("No content extracted from crawl, trying Tavily search API as fallback...");
        try {
          const searchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `site:${url.replace(/^https?:\/\//, '')}`,
              max_results: 20,
              include_domains: [url.replace(/^https?:\/\//, '').replace(/\/$/, '')],
            }),
          });

          if (searchResponse.ok) {
            const searchData = (await searchResponse.json()) as {
              results?: Array<{
                url?: string;
                content?: string;
                title?: string;
              }>;
            };

            if (searchData.results && searchData.results.length > 0) {
              console.log(`Search API returned ${searchData.results.length} results`);
              
              for (const resultItem of searchData.results) {
                if (resultItem.content && resultItem.content.trim().length > 50) {
                  const searchResult = await addCrawledContentToKnowledge({
                    url: resultItem.url || url,
                    title: resultItem.title || "Search Result",
                    content: resultItem.content,
                    crawledAt,
                  });

                  if (searchResult.success) {
                    totalChunksAdded += searchResult.chunksAdded;
                    console.log(`Search result added ${searchResult.chunksAdded} chunks`);
                  }
                }
              }
            }
          }
        } catch (searchError) {
          console.error("Search API fallback failed:", searchError);
        }
      }

      // Save cache metadata
      if (totalChunksAdded > 0) {
        await saveCacheMetadata(result.url, totalChunksAdded);
      }

      return NextResponse.json({
        ...result,
        cached: false,
        knowledgeBase: {
          added: totalChunksAdded > 0,
          chunksAdded: totalChunksAdded,
          pagesProcessed: crawlData.pages?.length || 0,
          oldChunksRemoved: clearResult.removed,
          errors: errors.length > 0 ? errors : undefined,
        },
        cacheAgeMinutes: 0,
      });
    }

    return NextResponse.json({
      ...result,
      cached: false,
      cacheAgeMinutes: 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to crawl website.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

