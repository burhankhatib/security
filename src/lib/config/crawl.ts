/**
 * Crawl Configuration - Now managed via Sanity CMS
 * 
 * Crawl sources are fetched from Sanity 'crawlSource' documents
 * This allows dynamic management without code changes
 */

import {client} from '@/sanity/lib/client'

export interface CrawlSource {
  _id: string
  name: string
  url: string
  active: boolean
  description?: string
  order: number
}

/**
 * Fetch all active crawl sources from Sanity
 * Returns sources ordered by 'order' field
 */
export async function getCrawlSourcesFromSanity(): Promise<CrawlSource[]> {
  try {
    const query = `*[_type == "crawlSource" && active == true] | order(order asc) {
      _id,
      name,
      url,
      active,
      description,
      order
    }`
    
    const sources = await client.fetch<CrawlSource[]>(query, {}, {
      cache: 'no-store', // Always get fresh data
    })
    
    console.log(`[Crawl Config] Found ${sources.length} active crawl sources from Sanity`)
    return sources
  } catch (error) {
    console.error('[Crawl Config] Failed to fetch crawl sources from Sanity:', error)
    // Return empty array - crawl API will handle no sources scenario
    return []
  }
}

/**
 * Get all active crawl source URLs as an array
 */
export async function getCrawlSourceUrls(): Promise<string[]> {
  const sources = await getCrawlSourcesFromSanity()
  return sources.map(source => source.url)
}

