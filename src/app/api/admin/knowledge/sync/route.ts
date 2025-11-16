import {NextResponse} from 'next/server'

import {generateKnowledgeIndex} from '@/lib/knowledge/vector'

const HEADER_KEY = 'x-knowledge-key'

export async function POST(request: Request) {
  const requiredKey = process.env.KNOWLEDGE_SYNC_KEY
  if (requiredKey) {
    const providedKey = request.headers.get(HEADER_KEY)
    if (!providedKey || providedKey !== requiredKey) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401})
    }
  }

  try {
    const {index, issues} = await generateKnowledgeIndex()
    return NextResponse.json({
      message: 'Knowledge base regenerated successfully.',
      generatedAt: index.generatedAt,
      chunks: index.chunks.length,
      embeddingModel: index.embeddingModel,
      issues,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to regenerate knowledge base.',
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500},
    )
  }
}

