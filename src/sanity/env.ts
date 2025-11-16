export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-10-31'

/**
 * Sanity dataset can be provided via either the public NEXT_ env
 * variables or the legacy SANITY_* ones.
 * Default to "production" so builds don't fail if Vercel envs are missing.
 */
export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_DATASET ||
  'production'

/**
 * Project ID with fallback to dummy value for builds without Sanity
 * This prevents build failures when Sanity is not configured
 */
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  'dummy-project-id'
