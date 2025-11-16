/**
 * Crawl Configuration
 * 
 * To change the crawl source URL, update CRAWL_SOURCE_URL below
 * or set it as an environment variable: CRAWL_SOURCE_URL=https://example.com
 * 
 * Current: OWASP Cheat Sheet Series - Comprehensive web security guidance
 */

export const CRAWL_SOURCE_URL =
  process.env.CRAWL_SOURCE_URL || "https://cheatsheetseries.owasp.org/";

export function getCrawlSourceUrl(): string {
  return CRAWL_SOURCE_URL;
}

