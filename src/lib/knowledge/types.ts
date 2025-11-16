export type KnowledgePriority = 'critical' | 'high' | 'standard' | 'reference'

export interface KnowledgeSourceFile {
  url: string
  mimeType?: string
  originalFilename?: string
}

export interface KnowledgeDocumentRecord {
  _id: string
  title: string
  slug: string
  summary?: string
  content?: string
  tags?: string[]
  language?: string
  importance?: KnowledgePriority
  updatedAt: string
  sourceFile?: KnowledgeSourceFile
}

export interface KnowledgeChunk {
  id: string
  docId: string
  docTitle: string
  slug: string
  chunkIndex: number
  content: string
  importance: KnowledgePriority
  language?: string
  tags: string[]
  embedding: number[]
}

export interface KnowledgeIndexFile {
  version: number
  generatedAt: string
  embeddingModel: string
  chunks: KnowledgeChunk[]
}

