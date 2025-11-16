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
 */
export async function isCrawlCacheValid(): Promise<boolean> {
  try {
    const metadata = await loadCacheMetadata()
    if (!metadata) {
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

