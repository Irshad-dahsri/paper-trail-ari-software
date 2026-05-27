import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
  validateRequestBody,
  createErrorResponse,
  toSnakeCase,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { paperTrailContracts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const CreateContractSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Contract name is required')
    .max(200, 'Contract name must be 200 characters or fewer'),
  terms_text: z
    .string()
    .trim()
    .min(1, 'Contract terms are required')
    .max(50000, 'Contract terms must be 50,000 characters or fewer'),
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const rows = await withRLS((db) =>
      db
        .select()
        .from(paperTrailContracts)
        .where(eq(paperTrailContracts.userId, user.id))
        .orderBy(desc(paperTrailContracts.createdAt)),
    )

    return NextResponse.json({ contracts: toSnakeCase(rows) })
  } catch (error) {
    console.error('GET /api/modules/paper-trail/contracts error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, CreateContractSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const inserted = await withRLS((db) =>
      db
        .insert(paperTrailContracts)
        .values({
          userId: user.id,
          name: validation.data.name,
          termsText: validation.data.terms_text,
        })
        .returning(),
    )

    return NextResponse.json({ contract: toSnakeCase(inserted[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/modules/paper-trail/contracts error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
