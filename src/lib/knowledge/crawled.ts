import { KnowledgeChunk } from './types'

/**
 * Check if a chunk is from crawled content
 */
export function isCrawledChunk(chunk: KnowledgeChunk): boolean {
  return chunk.tags?.includes('crawled') ?? false
}

/**
 * Separate chunks into crawled and non-crawled
 */
export function separateCrawledChunks(chunks: KnowledgeChunk[]): {
  crawled: KnowledgeChunk[]
  other: KnowledgeChunk[]
} {
  const crawled: KnowledgeChunk[] = []
  const other: KnowledgeChunk[] = []

  for (const chunk of chunks) {
    if (isCrawledChunk(chunk)) {
      crawled.push(chunk)
    } else {
      other.push(chunk)
    }
  }

  return { crawled, other }
}

/**
 * Check if chunks have sufficient relevance (score threshold)
 */
export function hasRelevantCrawledContent(
  crawledChunks: KnowledgeChunk[]
): boolean {
  // If we have crawled chunks, consider them relevant
  // The scoring happens in retrieveRelevantChunks
  return crawledChunks.length > 0
}

