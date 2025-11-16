import { NextResponse } from "next/server";
import { getCrawlSourcesFromSanity } from "@/lib/config/crawl";

/**
 * Test endpoint to debug crawl issues
 * Shows exactly what Tavily returns
 */
export async function GET() {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "TAVILY_API_KEY not configured" });
  }

  try {
    // Get sources from Sanity
    const sources = await getCrawlSourcesFromSanity();
    
    if (sources.length === 0) {
      return NextResponse.json({ 
        error: "No sources in Sanity",
        hint: "Add sources at /studio"
      });
    }

    const url = sources[0].url;
    const sourceName = sources[0].name;

    // Try Tavily Search API
    console.log(`[Test] Searching: ${url}`);
    
    const searchResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `site:${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
        max_results: 5,
        include_domains: [url.replace(/^https?:\/\//, '').replace(/\/$/, '')],
        search_depth: "advanced",
        include_raw_content: true,
      }),
    });

    if (!searchResponse.ok) {
      return NextResponse.json({ 
        error: "Tavily Search failed",
        status: searchResponse.status 
      });
    }

    const searchData = await searchResponse.json();
    
    // Show exactly what we got
    const results = searchData.results || [];
    const analysis = results.map((result: any, i: number) => ({
      index: i + 1,
      title: result.title || "No title",
      url: result.url || "No URL",
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      contentPreview: result.content?.substring(0, 200) || "No content",
      hasRawContent: !!result.raw_content,
      rawContentLength: result.raw_content?.length || 0,
      allKeys: Object.keys(result),
    }));

    return NextResponse.json({
      success: true,
      source: sourceName,
      url,
      resultsCount: results.length,
      analysis,
      fullFirstResult: results[0] || null,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

