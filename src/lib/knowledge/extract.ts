import {KnowledgeSourceFile} from './types'

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/html',
])

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx'])

const PDF_MIME_TYPES = new Set(['application/pdf'])

const WORD_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

function cleanText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractPdf(buffer: Buffer) {
  const pdfModule = await import('pdf-parse')
  const pdfParse = pdfModule.default ?? pdfModule
  const data = await pdfParse(buffer)
  if (!data || typeof data.text !== 'string') {
    throw new Error('Unable to extract text from PDF file.')
  }
  return cleanText(data.text)
}

async function extractWord(buffer: Buffer, mimeType?: string) {
  const mammothModule = await import('mammoth')
  const mammoth = (mammothModule.default ?? mammothModule) as {
    extractRawText?: (options: {buffer: Buffer}) => Promise<{value: string}>
  }

  if (typeof mammoth.extractRawText !== 'function') {
    throw new Error('Word document extraction is not supported in the current environment.')
  }

  if (mimeType === 'application/msword') {
    throw new Error('Legacy .doc files are not supported. Please upload a .docx document instead.')
  }

  const result = await mammoth.extractRawText({buffer})
  if (!result || typeof result.value !== 'string') {
    throw new Error('Unable to extract text from Word document.')
  }
  return cleanText(result.value)
}

function isLikelyMarkdown(source: KnowledgeSourceFile) {
  const ext = source.originalFilename?.split('.').pop()?.toLowerCase()
  return ext ? MARKDOWN_EXTENSIONS.has(ext) : false
}

export async function extractTextFromSourceFile(source: KnowledgeSourceFile): Promise<string> {
  if (!source.url) {
    throw new Error('Source file is missing a URL.')
  }

  const response = await fetch(source.url)
  if (!response.ok) {
    throw new Error(`Failed to download source file. Status: ${response.status}`)
  }

  const mimeType = source.mimeType ?? response.headers.get('content-type') ?? ''
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length === 0) {
    throw new Error('Source file is empty.')
  }

  try {
    if (TEXT_MIME_TYPES.has(mimeType) || isLikelyMarkdown(source)) {
      return cleanText(buffer.toString('utf8'))
    }

    if (PDF_MIME_TYPES.has(mimeType)) {
      return await extractPdf(buffer)
    }

    if (WORD_MIME_TYPES.has(mimeType)) {
      return await extractWord(buffer, mimeType)
    }

    // Attempt graceful fallback for unknown but text-like files
    if (mimeType.startsWith('text/')) {
      return cleanText(buffer.toString('utf8'))
    }

    throw new Error(`Unsupported file format: ${mimeType || 'unknown mime type'}`)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract text from source file: ${error.message}`)
    }
    throw new Error('Failed to extract text from source file due to an unknown error.')
  }
}

