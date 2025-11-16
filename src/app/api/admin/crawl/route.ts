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
    console.log(`[Crawl API] Starting crawl for: ${url}`);
    
    // Try Tavily Search API first (more reliable than crawl for many sites)
    const searchResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `site:${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
        max_results: 20,
        include_domains: [url.replace(/^https?:\/\//, '').replace(/\/$/, '')],
        search_depth: "advanced",
        include_raw_content: true,
      }),
    });

    if (!searchResponse.ok) {
      console.error(`[Crawl API] Search failed with status ${searchResponse.status}`);
      // Fall back to crawl API
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
            success: false,
            error: `Both Tavily search and crawl failed. Status: ${response.status}`,
            details: errorText,
          },
          { status: response.status }
        );
      }

      const rawData = await response.json();
      console.log("[Crawl API] Using crawl API fallback");
      // Continue processing below with rawData
    } else {
      console.log("[Crawl API] Using search API results - continuing to process");
    }

    // Process search results
    const searchData = await searchResponse.json();
    console.log(`[Crawl API] Search returned ${searchData.results?.length || 0} results`);

    // If search returns no results, try Crawl API as fallback
    if (!searchData.results || searchData.results.length === 0) {
      console.log("[Crawl API] No search results, falling back to Crawl API...");
      
      const crawlResponse = await fetch("https://api.tavily.com/crawl", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          max_depth: 5,
          max_pages: 100,
        }),
      });

      if (!crawlResponse.ok) {
        const errorText = await crawlResponse.text();
        return NextResponse.json({
          success: false,
          error: `Both Tavily Search and Crawl API failed. The website might not be accessible.`,
          details: `Search: No results. Crawl: ${crawlResponse.status} - ${errorText}`,
        }, { status: crawlResponse.status });
      }

      const crawlData = await crawlResponse.json();
      console.log("[Crawl API] Using Crawl API fallback - processing response");
      
      // Continue processing with crawl data
      const rawData = crawlData;
      return await processCrawlData(rawData, url, validationResult, apiKey);
    }

    // Convert search results to crawl-like format
    const rawData = {
      url,
      title: searchData.results[0]?.title || 'Search Results',
      content: searchData.results[0]?.content || searchData.results[0]?.raw_content || '',
      pages: searchData.results.map((result: any) => ({
        url: result.url,
        title: result.title,
        content: result.content || result.raw_content || '',
      })),
    };

    console.log("[Crawl API] Converted search results to crawl format");
    
    return await processCrawlData(rawData, url, validationResult, apiKey);
  } catch (error) {
    console.error("[Crawl API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to crawl website",
      },
      { status: 500 }
    );
  }
}

// Helper function to process crawl data
async function processCrawlData(rawData: any, url: string, validationResult: any, apiKey: string) {
  try {
    console.log("Tavily response structure:", {
      hasPages: Array.isArray(rawData.pages),
      pagesCount: rawData.pages?.length || 0,
      hasContent: !!rawData.content,
      mainContentLength: rawData.content?.length || 0,
    });

    // Already converted to standard format above, so use rawData directly
    let crawlData = rawData;

    // Validate and enhance if needed
    if (rawData.pages && Array.isArray(rawData.pages) && rawData.pages.length > 0) {
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
        content: rawData.content || processedPages.map((p: { content: string }) => p.content).join("\n\n"),
        pages: processedPages,
      };
    }
    // If rawData already has proper structure from search conversion, keep it as is
    
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

