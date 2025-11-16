import fs from 'node:fs/promises'
import path from 'node:path'

import {embedMany} from 'ai'
import {openai} from '@ai-sdk/openai'

import {chunkDocument} from './chunk'
import {extractTextFromSourceFile} from './extract'
import {fetchKnowledgeDocuments} from './sanity'
import {
  KnowledgeChunk,
  KnowledgeDocumentRecord,
  KnowledgeIndexFile,
  KnowledgePriority,
} from './types'

const EMBEDDING_MODEL = 'text-embedding-3-large'
const KNOWLEDGE_DIR = path.join(process.cwd(), 'public', 'knowledge')
const KNOWLEDGE_INDEX_PATH = path.join(KNOWLEDGE_DIR, 'knowledge-base.json')

export interface KnowledgeIngestionIssue {
  docId: string
  title: string
  reason: string
}

type ResolvedKnowledgeDocument = KnowledgeDocumentRecord & {content: string}

export interface KnowledgeIndexGenerationResult {
  index: KnowledgeIndexFile
  issues: KnowledgeIngestionIssue[]
}

export async function generateKnowledgeIndex(): Promise<KnowledgeIndexGenerationResult> {
  const documents = await fetchKnowledgeDocuments()
  const issues: KnowledgeIngestionIssue[] = []

  const resolvedDocuments: ResolvedKnowledgeDocument[] = []

  for (const doc of documents) {
    let content = (doc.content ?? '').trim()

    if (!content && doc.sourceFile) {
      try {
        content = await extractTextFromSourceFile(doc.sourceFile)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown extraction error.'
        issues.push({
          docId: doc._id,
          title: doc.title,
          reason: `Failed to extract text from uploaded file: ${message}`,
        })
        continue
      }
    }

    if (!content) {
      issues.push({
        docId: doc._id,
        title: doc.title,
        reason: 'Document is missing content. Provide text or upload a supported file.',
      })
      continue
    }

    resolvedDocuments.push({
      ...doc,
      content,
    })
  }

  if (resolvedDocuments.length === 0) {
    await ensureDirectory()
    const emptyIndex: KnowledgeIndexFile = {
      version: 1,
      generatedAt: new Date().toISOString(),
      embeddingModel: EMBEDDING_MODEL,
      chunks: [],
    }
    await fs.writeFile(KNOWLEDGE_INDEX_PATH, JSON.stringify(emptyIndex, null, 2), 'utf8')
    return {index: emptyIndex, issues}
  }

  const chunkInputs = resolvedDocuments.flatMap((doc) => {
    const chunks = chunkDocument(doc)
    return chunks.map((chunk) => ({
      doc,
      chunk,
    }))
  })

  const values = chunkInputs.map(({chunk}) => chunk.content)

  const {embeddings} = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values,
  })

  const indexedChunks: KnowledgeChunk[] = chunkInputs.map(({doc, chunk}, index) => ({
    id: `${doc._id}-${chunk.chunkIndex}`,
    docId: doc._id,
    docTitle: doc.title,
    slug: doc.slug,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    embedding: embeddings[index],
    importance: (doc.importance ?? 'standard') as KnowledgePriority,
    language: doc.language,
    tags: doc.tags ?? [],
  }))

  const payload: KnowledgeIndexFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    embeddingModel: EMBEDDING_MODEL,
    chunks: indexedChunks,
  }

  await ensureDirectory()
  await fs.writeFile(KNOWLEDGE_INDEX_PATH, JSON.stringify(payload, null, 2), 'utf8')

  return {index: payload, issues}
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndexFile> {
  try {
    const raw = await fs.readFile(KNOWLEDGE_INDEX_PATH, 'utf8')
    return JSON.parse(raw) as KnowledgeIndexFile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        version: 1,
        generatedAt: new Date(0).toISOString(),
        embeddingModel: EMBEDDING_MODEL,
        chunks: [],
      }
    }
    throw error
  }
}

async function ensureDirectory() {
  await fs.mkdir(KNOWLEDGE_DIR, {recursive: true})
}

export function dot(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0)
}

export function magnitude(a: number[]) {
  return Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))
}

export function cosineSimilarity(a: number[], b: number[]) {
  const magA = magnitude(a)
  const magB = magnitude(b)
  if (magA === 0 || magB === 0) return 0
  return dot(a, b) / (magA * magB)
}

const PRIORITY_WEIGHTS: Record<KnowledgePriority, number> = {
  critical: 1.3,
  high: 1.15,
  standard: 1,
  reference: 0.85,
}

export function weightedScore(similarity: number, priority: KnowledgePriority) {
  return similarity * PRIORITY_WEIGHTS[priority]
}

export async function retrieveRelevantChunks(query: string, topK = 4) {
  const index = await loadKnowledgeIndex()
  if (index.chunks.length === 0) {
    return [] as KnowledgeChunk[]
  }

  const {embeddings} = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: [query],
  })

  const queryEmbedding = embeddings[0]
  const scoredChunks = index.chunks
    .map((chunk) => ({
      chunk,
      score: weightedScore(cosineSimilarity(queryEmbedding, chunk.embedding), chunk.importance),
    }))
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)

  // Prioritize crawled chunks - they come first
  const crawledChunks = scoredChunks.filter(({chunk}) => chunk.tags?.includes('crawled'))
  const otherChunks = scoredChunks.filter(({chunk}) => !chunk.tags?.includes('crawled'))

  // Return crawled chunks first, then others, up to topK
  const prioritized = [...crawledChunks, ...otherChunks].slice(0, topK)
  return prioritized.map(({chunk}) => chunk)
}

/**
 * Retrieve only crawled chunks (prioritized source)
 * Uses very low threshold to ensure we get relevant content from crawled pages
 */
export async function retrieveCrawledChunks(query: string, topK = 15) {
  const index = await loadKnowledgeIndex()
  if (index.chunks.length === 0) {
    console.log('[Retrieval] No chunks in index')
    return [] as KnowledgeChunk[]
  }

  const crawledChunks = index.chunks.filter((chunk) => chunk.tags?.includes('crawled'))
  console.log(`[Retrieval] Found ${crawledChunks.length} crawled chunks out of ${index.chunks.length} total chunks`)
  
  if (crawledChunks.length === 0) {
    console.log('[Retrieval] No crawled chunks found')
    return [] as KnowledgeChunk[]
  }

  const {embeddings} = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: [query],
  })

  const queryEmbedding = embeddings[0]
  
  // Extract keywords from query for exact matching boost
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
  
  const scoredChunks = crawledChunks
    .map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
      let score = weightedScore(similarity, chunk.importance)
      
      // Boost score if chunk contains query keywords (exact match)
      const contentLower = chunk.content.toLowerCase()
      const keywordMatches = queryWords.filter(word => contentLower.includes(word)).length
      if (keywordMatches > 0) {
        // Boost by 20% per keyword match
        score *= (1 + (keywordMatches * 0.2))
      }
      
      return { chunk, score, similarity, keywordMatches }
    })
    .filter(({score}) => score > 0.1) // Very low threshold - prioritize recall over precision for crawled content
    .sort((a, b) => {
      // Sort by keyword matches first, then by score
      if (a.keywordMatches !== b.keywordMatches) {
        return b.keywordMatches - a.keywordMatches
      }
      return b.score - a.score
    })
    .slice(0, topK)

  console.log(`[Retrieval] Query: "${query}" - Retrieved ${scoredChunks.length} crawled chunks`)
  console.log(`[Retrieval] Top 3 scores: ${scoredChunks.slice(0, 3).map(s => `${s.score.toFixed(3)} (${s.keywordMatches} keywords)`).join(', ')}`)
  
  if (scoredChunks.length > 0) {
    const topChunk = scoredChunks[0]
    console.log(`[Retrieval] Top chunk (score: ${topChunk.score.toFixed(3)}, keywords: ${topChunk.keywordMatches}): ${topChunk.chunk.content.substring(0, 200)}...`)
  } else {
    console.warn(`[Retrieval] No chunks found for query: "${query}" - all chunks scored below threshold`)
  }

  return scoredChunks.map(({chunk}) => chunk)
}

