/**
 * Crawl Configuration
 * 
 * To change the crawl source URL, update CRAWL_SOURCE_URL below
 * or set it as an environment variable: CRAWL_SOURCE_URL=https://example.com
 */

export const CRAWL_SOURCE_URL =
  process.env.CRAWL_SOURCE_URL || "https://www.lanaline.ae/";

export function getCrawlSourceUrl(): string {
  return CRAWL_SOURCE_URL;
}

