export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-10-31'

/**
 * Sanity dataset can be provided via either the public NEXT_ env
 * variables or the legacy SANITY_* ones.
 * Default to "production" so builds don't fail if Vercel envs are missing.
 */
const resolvedDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_DATASET ||
  'production'

export const dataset = resolvedDataset

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
