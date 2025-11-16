import { NextResponse } from "next/server";
import {
  isCrawlCacheValid,
  loadCacheMetadata,
  getCacheAgeMinutes,
} from "@/lib/knowledge/cache";
import { getCrawlSourceUrl } from "@/lib/config/crawl";

/**
 * Check crawl cache status without triggering a crawl
 * Used by frontend to check if data is ready
 */
export async function GET() {
  try {
    const isValid = await isCrawlCacheValid();
    const metadata = await loadCacheMetadata();
    const ageMinutes = await getCacheAgeMinutes();
    const configuredUrl = getCrawlSourceUrl();

    return NextResponse.json({
      cacheValid: isValid,
      hasCache: metadata !== null,
      cacheAgeMinutes: ageMinutes,
      lastCrawledAt: metadata?.lastCrawledAt || null,
      configuredUrl,
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

