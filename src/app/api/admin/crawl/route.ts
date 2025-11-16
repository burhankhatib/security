import { NextResponse } from "next/server";
import { z } from "zod";
import { addCrawledContentToKnowledge } from "@/lib/knowledge/crawl";
import { getCrawlSourcesFromSanity, type CrawlSource } from "@/lib/config/crawl";
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

  const forceRefresh = validationResult.data.forceRefresh || false;

  // Fetch crawl sources from Sanity
  const crawlSources = await getCrawlSourcesFromSanity();
  
  if (crawlSources.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No active crawl sources found in Sanity. Please add crawl sources in Sanity Studio.",
      hint: "Go to /studio and add documents to 'Crawl Sources'",
    }, { status: 400 });
  }

  console.log(`[Crawl API] Found ${crawlSources.length} active sources from Sanity:`, 
    crawlSources.map(s => `${s.name} (${s.url})`).join(', '));

  // Create a combined URL signature for cache validation
  const urlsSignature = crawlSources.map(s => s.url).sort().join('|');

  // Check cache first (unless force refresh is requested)
  // Pass URL signature to validate cache matches current sources
  if (!forceRefresh && (await isCrawlCacheValid(urlsSignature))) {
    const cacheMetadata = await loadCacheMetadata();
    const ageMinutes = await getCacheAgeMinutes();

    return NextResponse.json({
      success: true,
      cached: true,
      sources: crawlSources.map(s => ({ name: s.name, url: s.url })),
      message: `Using cached crawl data (${ageMinutes} minutes old). Cache refreshes every hour.`,
      cacheAgeMinutes: ageMinutes,
      lastCrawledAt: cacheMetadata?.lastCrawledAt,
      chunksAdded: cacheMetadata?.chunksAdded || 0,
    });
  }

  try {
    // Clear old crawled content before adding new from multiple sources
    if (validationResult.data.addToKnowledge) {
      const { clearCrawledContent } = await import("@/lib/knowledge/crawl");
      await clearCrawledContent();
      console.log("[Crawl API] Cleared old crawled content");
    }

    let totalChunksAdded = 0;
    const sourceResults: Array<{
      source: string;
      url: string;
      success: boolean;
      chunksAdded: number;
      error?: string;
    }> = [];

    // Crawl each source sequentially
    for (const source of crawlSources) {
      console.log(`\n[Crawl API] Starting crawl for: ${source.name} (${source.url})`);
      
      try {
        const rawData = await crawlSingleSource(source.url, apiKey);
        
        if (validationResult.data.addToKnowledge && rawData) {
          const chunksAdded = await processAndAddToKnowledge(rawData, source.url, source.name);
          totalChunksAdded += chunksAdded;
          sourceResults.push({
            source: source.name,
            url: source.url,
            success: true,
            chunksAdded,
          });
          console.log(`[Crawl API] ✅ ${source.name}: ${chunksAdded} chunks added`);
        }
      } catch (error) {
        console.error(`[Crawl API] ❌ Failed to crawl ${source.name}:`, error);
        sourceResults.push({
          source: source.name,
          url: source.url,
          success: false,
          chunksAdded: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Save cache metadata with combined URL signature
    if (validationResult.data.addToKnowledge) {
      await saveCacheMetadata(urlsSignature, totalChunksAdded);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully crawled ${crawlSources.length} sources`,
      totalChunksAdded,
      sources: sourceResults,
      cached: false,
      cacheAgeMinutes: 0,
    });
  } catch (error) {
    console.error("[Crawl API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to crawl websites",
      },
      { status: 500 }
    );
  }
}

// Helper function to crawl a single source URL
async function crawlSingleSource(url: string, apiKey: string): Promise<any> {
  // Try Tavily Search API first
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

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    console.log(`[Crawl] Search API returned ${searchData.results?.length || 0} results`);
    
    if (searchData.results && searchData.results.length > 0) {
      // Convert search results to standard format
      return {
        url,
        title: searchData.results[0]?.title || 'Search Results',
        content: searchData.results[0]?.content || searchData.results[0]?.raw_content || '',
        pages: searchData.results.map((result: any) => ({
          url: result.url,
          title: result.title,
          content: result.content || result.raw_content || '',
        })),
      };
    }
  }

  // Fallback to Crawl API if search fails or returns no results
  console.log(`[Crawl] Search failed or no results, trying Crawl API...`);
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
    throw new Error(`Crawl API failed with status ${crawlResponse.status}`);
  }

  const crawlData = await crawlResponse.json();
  console.log(`[Crawl] Crawl API returned data`);
  return crawlData;
}

// Helper function to process crawled data and add to knowledge base
async function processAndAddToKnowledge(rawData: any, url: string, sourceName: string): Promise<number> {
  const { addCrawledContentToKnowledge } = await import("@/lib/knowledge/crawl");
  
  // Process pages from crawl data
  let totalChunks = 0;
  const crawledAt = new Date().toISOString();

  // Process all pages
  if (rawData.pages && Array.isArray(rawData.pages)) {
    for (const page of rawData.pages) {
      if (page.content && page.content.trim().length > 20) {
        const result = await addCrawledContentToKnowledge({
          url: page.url || url,
          title: `[${sourceName}] ${page.title || "Untitled Page"}`,
          content: page.content,
          crawledAt,
        });
        
        if (result.success) {
          totalChunks += result.chunksAdded;
        }
      }
    }
  }

  return totalChunks;
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

