import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
  validateRequestBody,
  createErrorResponse,
  toSnakeCase,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { paperTrailInvoices, paperTrailContracts, paperTrailAuditResults } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  callAnthropic,
  extractJsonObject,
  AnthropicConfigError,
  AnthropicCallError,
} from '../../../lib/anthropic-client'
import type { Discrepancy, DiscrepancySeverity, DiscrepancyType } from '../../../types'

const RunAuditSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice id'),
})

const DISCREPANCY_TYPES: DiscrepancyType[] = [
  'overbilling',
  'missing_receipt',
  'policy_violation',
  'rate_mismatch',
]
const SEVERITIES: DiscrepancySeverity[] = ['low', 'medium', 'high']

const SEVERITY_PENALTY: Record<DiscrepancySeverity, number> = {
  low: 5,
  medium: 15,
  high: 25,
}

interface RawDiscrepancy {
  type?: unknown
  severity?: unknown
  description?: unknown
  amount_impact?: unknown
}

interface AiAuditPayload {
  discrepancies?: unknown
  fix_email_draft?: unknown
}

function sanitizeDiscrepancies(raw: unknown): Discrepancy[] {
  if (!Array.isArray(raw)) return []
  const cleaned: Discrepancy[] = []
  for (const item of raw as RawDiscrepancy[]) {
    if (!item || typeof item !== 'object') continue
    const type = typeof item.type === 'string' && DISCREPANCY_TYPES.includes(item.type as DiscrepancyType)
      ? (item.type as DiscrepancyType)
      : null
    const severity = typeof item.severity === 'string' && SEVERITIES.includes(item.severity as DiscrepancySeverity)
      ? (item.severity as DiscrepancySeverity)
      : null
    const description = typeof item.description === 'string' ? item.description.trim().slice(0, 1000) : ''
    if (!type || !severity || !description) continue
    const entry: Discrepancy = { type, severity, description }
    if (typeof item.amount_impact === 'number' && Number.isFinite(item.amount_impact)) {
      entry.amount_impact = Math.round(item.amount_impact * 100) / 100
    }
    cleaned.push(entry)
  }
  return cleaned
}

function computeScore(discrepancies: Discrepancy[]): number {
  let score = 100
  for (const d of discrepancies) {
    score -= SEVERITY_PENALTY[d.severity] ?? 0
  }
  return Math.max(0, Math.min(100, score))
}

const SYSTEM_PROMPT = `You are a billing-audit assistant. You compare an invoice against a contract's billing terms and identify discrepancies.

Respond with ONLY a single JSON object — no commentary, no markdown fences. The JSON object must have this exact shape:

{
  "discrepancies": [
    {
      "type": "overbilling" | "missing_receipt" | "policy_violation" | "rate_mismatch",
      "severity": "low" | "medium" | "high",
      "description": "Short, specific explanation of the issue",
      "amount_impact": 123.45
    }
  ],
  "fix_email_draft": "A professional vendor-correction email referencing the discrepancies above. Use a polite, neutral tone. Sign off with [Your Name]."
}

Rules:
- "discrepancies" MUST be an array (empty if none found).
- "amount_impact" is optional and must be a number in dollars (omit if not applicable).
- Severity guide: low = minor/cosmetic, medium = clear billing error, high = serious overbilling, missing legally-required receipt, or material policy violation.
- "fix_email_draft" MUST be a single string with line breaks. No HTML.`

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, RunAuditSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const invoiceRows = await withRLS((db) =>
      db
        .select({
          id: paperTrailInvoices.id,
          contractId: paperTrailInvoices.contractId,
          invoiceText: paperTrailInvoices.invoiceText,
          imageFilename: paperTrailInvoices.imageFilename,
        })
        .from(paperTrailInvoices)
        .where(
          and(
            eq(paperTrailInvoices.id, validation.data.invoice_id),
            eq(paperTrailInvoices.userId, user.id),
          ),
        )
        .limit(1),
    )
    if (invoiceRows.length === 0) {
      return createErrorResponse('Invoice not found', 404)
    }
    const invoice = invoiceRows[0]

    const contractRows = await withRLS((db) =>
      db
        .select({
          name: paperTrailContracts.name,
          termsText: paperTrailContracts.termsText,
        })
        .from(paperTrailContracts)
        .where(
          and(
            eq(paperTrailContracts.id, invoice.contractId),
            eq(paperTrailContracts.userId, user.id),
          ),
        )
        .limit(1),
    )
    if (contractRows.length === 0) {
      return createErrorResponse('Linked contract not found', 404)
    }
    const contract = contractRows[0]

    const userPrompt = [
      `Contract name: ${contract.name}`,
      '',
      'Contract terms:',
      contract.termsText,
      '',
      'Invoice text:',
      invoice.invoiceText,
      '',
      invoice.imageFilename
        ? `Receipt image attached: ${invoice.imageFilename}`
        : 'No receipt image attached.',
    ].join('\n')

    let rawResponse: string
    try {
      rawResponse = await callAnthropic(user.id, {
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2048,
        temperature: 0.1,
      })
    } catch (error) {
      if (error instanceof AnthropicConfigError) {
        return createErrorResponse(error.message, 400)
      }
      if (error instanceof AnthropicCallError) {
        return createErrorResponse(error.message, 502)
      }
      throw error
    }

    let parsed: AiAuditPayload
    try {
      parsed = extractJsonObject<AiAuditPayload>(rawResponse)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse AI response'
      return createErrorResponse(message, 502)
    }

    const discrepancies = sanitizeDiscrepancies(parsed.discrepancies)
    const score = computeScore(discrepancies)
    const fixEmailDraft = typeof parsed.fix_email_draft === 'string'
      ? parsed.fix_email_draft.trim().slice(0, 10000)
      : ''

    const inserted = await withRLS((db) =>
      db
        .insert(paperTrailAuditResults)
        .values({
          userId: user.id,
          invoiceId: invoice.id,
          score,
          discrepanciesJson: discrepancies,
          fixEmailDraft,
        })
        .returning(),
    )

    return NextResponse.json({ audit: toSnakeCase(inserted[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/modules/paper-trail/audits/run error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
