import fs from 'node:fs/promises'
import path from 'node:path'

const CACHE_DIR = path.join(process.cwd(), 'public', 'knowledge')
const CACHE_METADATA_PATH = path.join(CACHE_DIR, 'crawl-cache.json')

export interface CrawlCacheMetadata {
  lastCrawledAt: string
  url: string
  chunksAdded: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Check if cached crawl data is still valid
 * Validates both age and URL match
 */
export async function isCrawlCacheValid(currentUrl?: string): Promise<boolean> {
  try {
    const metadata = await loadCacheMetadata()
    if (!metadata) {
      return false
    }

    // If URL is provided and doesn't match cached URL, invalidate cache
    if (currentUrl && metadata.url !== currentUrl) {
      console.log(`[Cache] URL changed from ${metadata.url} to ${currentUrl} - invalidating cache`)
      return false
    }

    const lastCrawled = new Date(metadata.lastCrawledAt).getTime()
    const now = Date.now()
    const age = now - lastCrawled

    return age < CACHE_TTL_MS
  } catch {
    return false
  }
}

/**
 * Load cache metadata
 */
export async function loadCacheMetadata(): Promise<CrawlCacheMetadata | null> {
  try {
    const raw = await fs.readFile(CACHE_METADATA_PATH, 'utf8')
    return JSON.parse(raw) as CrawlCacheMetadata
  } catch {
    return null
  }
}

/**
 * Save cache metadata
 */
export async function saveCacheMetadata(
  url: string,
  chunksAdded: number
): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  const metadata: CrawlCacheMetadata = {
    lastCrawledAt: new Date().toISOString(),
    url,
    chunksAdded,
  }
  await fs.writeFile(
    CACHE_METADATA_PATH,
    JSON.stringify(metadata, null, 2),
    'utf8'
  )
}

/**
 * Get cache age in minutes
 */
export async function getCacheAgeMinutes(): Promise<number | null> {
  try {
    const metadata = await loadCacheMetadata()
    if (!metadata) {
      return null
    }

    const lastCrawled = new Date(metadata.lastCrawledAt).getTime()
    const now = Date.now()
    const ageMinutes = Math.floor((now - lastCrawled) / (60 * 1000))

    return ageMinutes
  } catch {
    return null
  }
}

/**
 * Clear cache (force new crawl on next request)
 */
export async function clearCache(): Promise<void> {
  try {
    await fs.unlink(CACHE_METADATA_PATH)
    console.log('[Cache] Cache metadata cleared')
  } catch (error) {
    // File might not exist, that's okay
    console.log('[Cache] No cache to clear or error clearing:', error)
  }
}

