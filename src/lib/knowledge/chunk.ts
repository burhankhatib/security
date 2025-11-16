import {KnowledgeDocumentRecord} from './types'

const DEFAULT_MAX_TOKENS = 500
const OVERLAP_RATIO = 0.15

function estimateTokens(text: string) {
  // Rough heuristic: 4 characters ~= 1 token for English text
  return Math.ceil(text.length / 4)
}

function splitIntoSentences(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/u)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function chunkDocument(
  doc: KnowledgeDocumentRecord & {content: string},
  maxTokens: number = DEFAULT_MAX_TOKENS,
) {
  const sentences = splitIntoSentences(doc.content)
  if (sentences.length === 0) {
    return [] as Array<{content: string; chunkIndex: number}>
  }

  const chunks: Array<{content: string; chunkIndex: number}> = []
  let currentChunk: string[] = []
  let currentTokens = 0
  let chunkIndex = 0

  sentences.forEach((sentence) => {
    const tokens = estimateTokens(sentence)

    if (currentTokens + tokens > maxTokens && currentChunk.length > 0) {
      chunks.push({content: currentChunk.join(' ').trim(), chunkIndex})
      chunkIndex += 1

      const overlapSize = Math.max(1, Math.floor(currentChunk.length * OVERLAP_RATIO))
      currentChunk = currentChunk.slice(-overlapSize)
      currentTokens = estimateTokens(currentChunk.join(' '))
    }

    currentChunk.push(sentence)
    currentTokens += tokens
  })

  if (currentChunk.length > 0) {
    chunks.push({content: currentChunk.join(' ').trim(), chunkIndex})
  }

  return chunks
}

