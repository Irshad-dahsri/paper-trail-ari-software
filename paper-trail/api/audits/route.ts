import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { paperTrailAuditResults } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const rows = await withRLS((db) =>
      db
        .select()
        .from(paperTrailAuditResults)
        .where(eq(paperTrailAuditResults.userId, user.id))
        .orderBy(desc(paperTrailAuditResults.createdAt)),
    )

    return NextResponse.json({ audits: toSnakeCase(rows) })
  } catch (error) {
    console.error('GET /api/modules/paper-trail/audits error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
