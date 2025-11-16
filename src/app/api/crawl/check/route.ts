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
    const configuredUrl = getCrawlSourceUrl();
    // Pass current URL to validate cache matches configured URL
    const isValid = await isCrawlCacheValid(configuredUrl);
    const metadata = await loadCacheMetadata();
    const ageMinutes = await getCacheAgeMinutes();

    console.log(`[Cache Check] Configured URL: ${configuredUrl}, Cache valid: ${isValid}, Cached URL: ${metadata?.url || 'none'}`);

    return NextResponse.json({
      cacheValid: isValid,
      hasCache: metadata !== null,
      cacheAgeMinutes: ageMinutes,
      lastCrawledAt: metadata?.lastCrawledAt || null,
      configuredUrl,
      cachedUrl: metadata?.url || null,
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

