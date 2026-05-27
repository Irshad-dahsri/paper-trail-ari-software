export interface Contract {
  id: string
  user_id: string
  name: string
  terms_text: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string
  contract_id: string
  invoice_text: string
  image_filename?: string | null
  created_at: string
  updated_at: string
}

export type DiscrepancyType = 'overbilling' | 'missing_receipt' | 'policy_violation' | 'rate_mismatch'
export type DiscrepancySeverity = 'low' | 'medium' | 'high'

export interface Discrepancy {
  type: DiscrepancyType
  severity: DiscrepancySeverity
  description: string
  amount_impact?: number
}

export interface AuditResult {
  id: string
  user_id: string
  invoice_id: string
  score: number
  discrepancies_json: Discrepancy[]
  fix_email_draft: string
  created_at: string
}

export interface CreateContractRequest {
  name: string
  terms_text: string
}

export interface UpdateContractRequest {
  name: string
  terms_text: string
}

export interface CreateInvoiceRequest {
  contract_id: string
  invoice_text: string
  image_filename?: string | null
}

export interface UpdateInvoiceRequest {
  contract_id: string
  invoice_text: string
  image_filename?: string | null
}

export interface RunAuditRequest {
  invoice_id: string
}

export interface ApiErrorResponse {
  error: string
  details?: unknown
}
