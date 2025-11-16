import { NextResponse } from 'next/server'

/**
 * Health check endpoint to verify deployment is working
 * Access at: /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Deployment is live and healthy',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasTavily: !!process.env.TAVILY_API_KEY,
      hasSanityProject: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      hasSanityDataset: !!process.env.NEXT_PUBLIC_SANITY_DATASET,
    },
  })
}

export const dynamic = 'force-dynamic'

