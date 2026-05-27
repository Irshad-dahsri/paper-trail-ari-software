import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
  validateRequestBody,
  createErrorResponse,
  toSnakeCase,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { paperTrailInvoices, paperTrailContracts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const FILENAME_RE = /^[A-Za-z0-9._-]+$/

const UpdateInvoiceSchema = z.object({
  contract_id: z.string().uuid('Invalid contract id'),
  invoice_text: z
    .string()
    .trim()
    .min(1, 'Invoice text is required')
    .max(100000, 'Invoice text must be 100,000 characters or fewer'),
  image_filename: z
    .string()
    .trim()
    .max(255, 'Image filename must be 255 characters or fewer')
    .regex(FILENAME_RE, 'Image filename contains invalid characters')
    .optional()
    .nullable(),
})

const IdSchema = z.string().uuid('Invalid invoice id')

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid invoice id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const rows = await withRLS((db) =>
      db
        .select()
        .from(paperTrailInvoices)
        .where(and(eq(paperTrailInvoices.id, idParse.data), eq(paperTrailInvoices.userId, user.id)))
        .limit(1),
    )

    if (rows.length === 0) {
      return createErrorResponse('Invoice not found', 404)
    }

    return NextResponse.json({ invoice: toSnakeCase(rows[0]) })
  } catch (error) {
    console.error('GET /api/modules/paper-trail/invoices/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid invoice id', 400)
    }

    const validation = await validateRequestBody(request, UpdateInvoiceSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const contractRows = await withRLS((db) =>
      db
        .select({ id: paperTrailContracts.id })
        .from(paperTrailContracts)
        .where(
          and(
            eq(paperTrailContracts.id, validation.data.contract_id),
            eq(paperTrailContracts.userId, user.id),
          ),
        )
        .limit(1),
    )
    if (contractRows.length === 0) {
      return createErrorResponse('Contract not found', 404)
    }

    const updated = await withRLS((db) =>
      db
        .update(paperTrailInvoices)
        .set({
          contractId: validation.data.contract_id,
          invoiceText: validation.data.invoice_text,
          imageFilename: validation.data.image_filename ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(paperTrailInvoices.id, idParse.data), eq(paperTrailInvoices.userId, user.id)))
        .returning(),
    )

    if (updated.length === 0) {
      return createErrorResponse('Invoice not found', 404)
    }

    return NextResponse.json({ invoice: toSnakeCase(updated[0]) })
  } catch (error) {
    console.error('PUT /api/modules/paper-trail/invoices/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const idParse = IdSchema.safeParse(id)
    if (!idParse.success) {
      return createErrorResponse('Invalid invoice id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const deleted = await withRLS((db) =>
      db
        .delete(paperTrailInvoices)
        .where(and(eq(paperTrailInvoices.id, idParse.data), eq(paperTrailInvoices.userId, user.id)))
        .returning({ id: paperTrailInvoices.id }),
    )

    if (deleted.length === 0) {
      return createErrorResponse('Invoice not found', 404)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/modules/paper-trail/invoices/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
