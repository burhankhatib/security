import {groq} from 'next-sanity'

import {client} from '@/sanity/lib/client'

const PROMPT_QUERY = groq`
  *[_type == "systemPrompt"] | order(_updatedAt desc) {
    title,
    "prompt": description,
    "updatedAt": _updatedAt
  }[0]
`

export interface SystemPromptDocument {
  title: string
  prompt: string
  updatedAt: string
}

export async function fetchLatestSystemPrompt(): Promise<SystemPromptDocument | null> {
  const promptClient = client.withConfig({useCdn: false})
  const result = await promptClient.fetch<SystemPromptDocument | null>(PROMPT_QUERY, {}, {
    cache: 'no-store',
    next: {revalidate: 0},
  })
  if (!result) return null
  if (!result.prompt?.trim()) return null

  return {
    ...result,
    prompt: result.prompt.trim(),
  }
}

