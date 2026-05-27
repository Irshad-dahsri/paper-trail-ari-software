import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
  validateRequestBody,
  createErrorResponse,
  toSnakeCase,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { paperTrailInvoices, paperTrailContracts } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'

const FILENAME_RE = /^[A-Za-z0-9._-]+$/

const CreateInvoiceSchema = z.object({
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

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const rows = await withRLS((db) =>
      db
        .select()
        .from(paperTrailInvoices)
        .where(eq(paperTrailInvoices.userId, user.id))
        .orderBy(desc(paperTrailInvoices.createdAt)),
    )

    return NextResponse.json({ invoices: toSnakeCase(rows) })
  } catch (error) {
    console.error('GET /api/modules/paper-trail/invoices error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, CreateInvoiceSchema)
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

    const inserted = await withRLS((db) =>
      db
        .insert(paperTrailInvoices)
        .values({
          userId: user.id,
          contractId: validation.data.contract_id,
          invoiceText: validation.data.invoice_text,
          imageFilename: validation.data.image_filename ?? null,
        })
        .returning(),
    )

    return NextResponse.json({ invoice: toSnakeCase(inserted[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/modules/paper-trail/invoices error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
