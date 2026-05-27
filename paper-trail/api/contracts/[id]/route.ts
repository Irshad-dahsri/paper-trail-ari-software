import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
  validateRequestBody,
  createErrorResponse,
  toSnakeCase,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { paperTrailContracts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const UpdateContractSchema = z.object({
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

const IdSchema = z.string().uuid('Invalid contract id')

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid contract id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const rows = await withRLS((db) =>
      db
        .select()
        .from(paperTrailContracts)
        .where(and(eq(paperTrailContracts.id, idParse.data), eq(paperTrailContracts.userId, user.id)))
        .limit(1),
    )

    if (rows.length === 0) {
      return createErrorResponse('Contract not found', 404)
    }

    return NextResponse.json({ contract: toSnakeCase(rows[0]) })
  } catch (error) {
    console.error('GET /api/modules/paper-trail/contracts/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid contract id', 400)
    }

    const validation = await validateRequestBody(request, UpdateContractSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const updated = await withRLS((db) =>
      db
        .update(paperTrailContracts)
        .set({
          name: validation.data.name,
          termsText: validation.data.terms_text,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(paperTrailContracts.id, idParse.data), eq(paperTrailContracts.userId, user.id)))
        .returning(),
    )

    if (updated.length === 0) {
      return createErrorResponse('Contract not found', 404)
    }

    return NextResponse.json({ contract: toSnakeCase(updated[0]) })
  } catch (error) {
    console.error('PUT /api/modules/paper-trail/contracts/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid contract id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const deleted = await withRLS((db) =>
      db
        .delete(paperTrailContracts)
        .where(and(eq(paperTrailContracts.id, idParse.data), eq(paperTrailContracts.userId, user.id)))
        .returning({ id: paperTrailContracts.id }),
    )

    if (deleted.length === 0) {
      return createErrorResponse('Contract not found', 404)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/modules/paper-trail/contracts/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
