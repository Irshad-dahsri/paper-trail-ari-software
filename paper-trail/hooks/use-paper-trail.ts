import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Contract,
  Invoice,
  AuditResult,
  CreateContractRequest,
  UpdateContractRequest,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
} from '@/modules/paper-trail/types'

const CONTRACTS_KEY = ['paper-trail-contracts']
const INVOICES_KEY = ['paper-trail-invoices']
const AUDITS_KEY = ['paper-trail-audits']

async function parseError(res: Response): Promise<string> {
  try {
    const err = await res.json()
    const details = Array.isArray(err?.details)
      ? err.details
          .map((d: { message?: string }) => d?.message)
          .filter(Boolean)
          .join(', ')
      : ''
    return details || err?.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// ─── Contracts ──────────────────────────────────────────────────────────

export function useContracts() {
  return useQuery({
    queryKey: CONTRACTS_KEY,
    queryFn: async (): Promise<Contract[]> => {
      const res = await fetch('/api/modules/paper-trail/contracts')
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.contracts || []
    },
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateContractRequest): Promise<Contract> => {
      const res = await fetch('/api/modules/paper-trail/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.contract
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY })
    },
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateContractRequest & { id: string }): Promise<Contract> => {
      const res = await fetch(`/api/modules/paper-trail/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.contract
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY })
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/paper-trail/contracts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: CONTRACTS_KEY })
      const previous = queryClient.getQueryData<Contract[]>(CONTRACTS_KEY)
      queryClient.setQueryData<Contract[]>(CONTRACTS_KEY, (old = []) =>
        old.filter((c) => c.id !== deletedId),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(CONTRACTS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY })
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY })
      queryClient.invalidateQueries({ queryKey: AUDITS_KEY })
    },
  })
}

// ─── Invoices ───────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: INVOICES_KEY,
    queryFn: async (): Promise<Invoice[]> => {
      const res = await fetch('/api/modules/paper-trail/invoices')
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.invoices || []
    },
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateInvoiceRequest): Promise<Invoice> => {
      const res = await fetch('/api/modules/paper-trail/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.invoice
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateInvoiceRequest & { id: string }): Promise<Invoice> => {
      const res = await fetch(`/api/modules/paper-trail/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.invoice
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/paper-trail/invoices/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: INVOICES_KEY })
      const previous = queryClient.getQueryData<Invoice[]>(INVOICES_KEY)
      queryClient.setQueryData<Invoice[]>(INVOICES_KEY, (old = []) =>
        old.filter((i) => i.id !== deletedId),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(INVOICES_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY })
      queryClient.invalidateQueries({ queryKey: AUDITS_KEY })
    },
  })
}

// ─── Audits ─────────────────────────────────────────────────────────────

export function useAudits() {
  return useQuery({
    queryKey: AUDITS_KEY,
    queryFn: async (): Promise<AuditResult[]> => {
      const res = await fetch('/api/modules/paper-trail/audits')
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.audits || []
    },
  })
}

export function useRunAudit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoiceId: string): Promise<AuditResult> => {
      const res = await fetch('/api/modules/paper-trail/audits/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = await res.json()
      return data.audit
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AUDITS_KEY })
    },
  })
}

// ─── Receipt upload ─────────────────────────────────────────────────────

export function useUploadReceipt() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ name: string; path: string }> => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/modules/paper-trail/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(await parseError(res))
      return await res.json()
    },
  })
}
