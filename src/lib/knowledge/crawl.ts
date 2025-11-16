import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import {embedMany} from 'ai'
import {openai} from '@ai-sdk/openai'

import {chunkDocument} from './chunk'
import {loadKnowledgeIndex} from './vector'
import {
  KnowledgeChunk,
  KnowledgeDocumentRecord,
  KnowledgeIndexFile,
  KnowledgePriority,
} from './types'

const EMBEDDING_MODEL = 'text-embedding-3-large'

// Use /tmp in production (Vercel/serverless) or local directory in development
const KNOWLEDGE_DIR = process.env.VERCEL 
  ? path.join(os.tmpdir(), 'knowledge')
  : path.join(process.cwd(), '.cache', 'knowledge')

const KNOWLEDGE_INDEX_PATH = path.join(KNOWLEDGE_DIR, 'knowledge-base.json')

export interface CrawledContent {
  url: string
  title: string
  content: string
  crawledAt: string
}

/**
 * Remove all crawled chunks from the knowledge index
 */
export async function clearCrawledContent(): Promise<{ removed: number }> {
  try {
    const existingIndex = await loadKnowledgeIndex()
    const nonCrawledChunks = existingIndex.chunks.filter(
      (chunk) => !chunk.tags?.includes('crawled')
    )

    const updatedIndex: KnowledgeIndexFile = {
      ...existingIndex,
      chunks: nonCrawledChunks,
      generatedAt: new Date().toISOString(),
    }

    await fs.writeFile(KNOWLEDGE_INDEX_PATH, JSON.stringify(updatedIndex, null, 2), 'utf8')

    return {
      removed: existingIndex.chunks.length - nonCrawledChunks.length,
    }
  } catch (error) {
    console.error('Failed to clear crawled content:', error)
    return { removed: 0 }
  }
}

export async function addCrawledContentToKnowledge(
  crawledContent: CrawledContent
): Promise<{ success: boolean; chunksAdded: number; error?: string }> {
  try {
    console.log(`[Crawl] Adding content from: ${crawledContent.url}`)
    console.log(`[Crawl] Content length: ${crawledContent.content?.length || 0} characters`)
    
    const existingIndex = await loadKnowledgeIndex()

    // Create a temporary document record for the crawled content
    const tempDoc: KnowledgeDocumentRecord & { content: string } = {
      _id: `crawled-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: crawledContent.title || crawledContent.url,
      slug: crawledContent.url.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
      content: crawledContent.content,
      summary: `Crawled from ${crawledContent.url}`,
      tags: ['crawled', 'web'],
      language: 'en',
      importance: 'standard' as KnowledgePriority,
      updatedAt: crawledContent.crawledAt,
    }

    // Chunk the content
    const chunks = chunkDocument(tempDoc)
    console.log(`[Crawl] Generated ${chunks.length} chunks from content`)

    if (chunks.length === 0) {
      console.warn(`[Crawl] No chunks generated from ${crawledContent.url}`)
      return {
        success: false,
        chunksAdded: 0,
        error: 'No content chunks generated from crawled content',
      }
    }

    // Generate embeddings
    const values = chunks.map((chunk) => chunk.content)
    console.log(`[Crawl] Generating embeddings for ${values.length} chunks...`)
    const {embeddings} = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values,
    })
    console.log(`[Crawl] Embeddings generated successfully`)

    // Create indexed chunks
    const indexedChunks: KnowledgeChunk[] = chunks.map((chunk, index) => ({
      id: `${tempDoc._id}-${chunk.chunkIndex}`,
      docId: tempDoc._id,
      docTitle: tempDoc.title,
      slug: tempDoc.slug,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: embeddings[index],
      importance: (tempDoc.importance ?? 'standard') as KnowledgePriority,
      language: tempDoc.language ?? 'en',
      tags: tempDoc.tags ?? [],
    }))

    // Merge with existing index
    const updatedIndex: KnowledgeIndexFile = {
      ...existingIndex,
      chunks: [...existingIndex.chunks, ...indexedChunks],
      generatedAt: new Date().toISOString(),
    }

    console.log(`[Crawl] Writing index with ${updatedIndex.chunks.length} total chunks`)
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(KNOWLEDGE_INDEX_PATH), { recursive: true })
    
    // Write updated index
    await fs.writeFile(KNOWLEDGE_INDEX_PATH, JSON.stringify(updatedIndex, null, 2), 'utf8')
    console.log(`[Crawl] Successfully wrote ${indexedChunks.length} new chunks to index`)

    return {
      success: true,
      chunksAdded: indexedChunks.length,
    }
  } catch (error) {
    console.error('[Crawl] Error adding content to knowledge:', error)
    return {
      success: false,
      chunksAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

