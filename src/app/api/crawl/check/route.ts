import { NextResponse } from "next/server";
import {
  isCrawlCacheValid,
  loadCacheMetadata,
  getCacheAgeMinutes,
} from "@/lib/knowledge/cache";
import { getCrawlSourcesFromSanity } from "@/lib/config/crawl";

/**
 * Check crawl cache status without triggering a crawl
 * Used by frontend to check if data is ready
 */
export async function GET() {
  try {
    const sanitySources = await getCrawlSourcesFromSanity();
    const urlsSignature = sanitySources.map(s => s.url).sort().join('|');
    
    // Pass URL signature to validate cache matches current Sanity sources
    const isValid = await isCrawlCacheValid(urlsSignature);
    const metadata = await loadCacheMetadata();
    const ageMinutes = await getCacheAgeMinutes();

    console.log(`[Cache Check] Found ${sanitySources.length} sources from Sanity, Cache valid: ${isValid}`);

    return NextResponse.json({
      cacheValid: isValid,
      hasCache: metadata !== null,
      cacheAgeMinutes: ageMinutes,
      lastCrawledAt: metadata?.lastCrawledAt || null,
      sources: sanitySources.map(s => ({ name: s.name, url: s.url })),
      cachedSignature: metadata?.url || null,
      chunksInCache: metadata?.chunksAdded || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check cache status.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

