import {groq} from 'next-sanity'

import {client} from '@/sanity/lib/client'

import {KnowledgeDocumentRecord} from './types'

const KNOWLEDGE_QUERY = groq`
  *[_type == "knowledgeDocument" && (defined(content) || defined(sourceFile.asset))] | order(_updatedAt desc) {
    _id,
    title,
    "slug": slug.current,
    summary,
    content,
    tags,
    language,
    coalesce(importance, 'standard') as importance,
    "updatedAt": _updatedAt,
    "sourceFile": sourceFile.asset->{
      "url": url,
      mimeType,
      originalFilename
    }
  }
`

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocumentRecord[]> {
  try {
    const documents = await client.fetch<Array<KnowledgeDocumentRecord>>(KNOWLEDGE_QUERY)
    return documents.map((doc) => ({
      ...doc,
      tags: doc.tags ?? [],
      importance: (doc.importance ?? 'standard') as KnowledgeDocumentRecord['importance'],
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
      sourceFile: doc.sourceFile?.url ? doc.sourceFile : undefined,
    }))
  } catch (error) {
    console.warn('Failed to fetch knowledge documents from Sanity:', error)
    // Return empty array if Sanity is not configured
    return []
  }
}

