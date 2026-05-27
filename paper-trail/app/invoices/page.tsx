'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Paperclip,
  Play,
  X,
  FileText,
} from 'lucide-react'
import { PageTitle } from '../../components/page-title'
import { AuditReport } from '../../components/audit-report'
import {
  useContracts,
  useInvoices,
  useAudits,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useUploadReceipt,
  useRunAudit,
} from '../../hooks/use-paper-trail'
import type { Contract, Invoice } from '@/modules/paper-trail/types'

interface FormState {
  contractId: string
  invoiceText: string
  imageFilename: string | null
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = { contractId: '', invoiceText: '', imageFilename: null }

const TEXT_MAX = 100000
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function validate(form: FormState, contracts: Contract[]): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.contractId) {
    errors.contractId = 'Select a contract'
  } else if (!contracts.some((c) => c.id === form.contractId)) {
    errors.contractId = 'Contract no longer exists'
  }
  if (!form.invoiceText.trim()) errors.invoiceText = 'Invoice text is required'
  else if (form.invoiceText.length > TEXT_MAX)
    errors.invoiceText = `Must be ${TEXT_MAX.toLocaleString()} characters or fewer`
  return errors
}

export default function PaperTrailInvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: contracts = [] } = useContracts()
  const { data: invoices = [], isLoading } = useInvoices()
  const { data: audits = [] } = useAudits()

  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()
  const uploadReceipt = useUploadReceipt()
  const runAudit = useRunAudit()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null)
  const [auditingInvoiceId, setAuditingInvoiceId] = useState<string | null>(null)
  const [showAuditId, setShowAuditId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const latestAuditByInvoice = useMemo(() => {
    const map = new Map<string, (typeof audits)[number]>()
    for (const a of audits) {
      const existing = map.get(a.invoice_id)
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        map.set(a.invoice_id, a)
      }
    }
    return map
  }, [audits])

  const contractById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts],
  )

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, contractId: contracts[0]?.id ?? '' })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice)
    setForm({
      contractId: invoice.contract_id,
      invoiceText: invoice.invoice_text,
      imageFilename: invoice.image_filename ?? null,
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleFilePick = async (file: File | undefined) => {
    if (!file) return
    if (!ALLOWED_MIME.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Accepted formats: JPEG, PNG, WebP, PDF.',
      })
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum size is 10 MB.',
      })
      return
    }
    try {
      const result = await uploadReceipt.mutateAsync(file)
      updateField('imageFilename', result.name)
      toast({ title: 'Receipt uploaded' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = () => {
    const fieldErrors = validate(form, contracts)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const payload = {
      contract_id: form.contractId,
      invoice_text: form.invoiceText.trim(),
      image_filename: form.imageFilename ?? null,
    }

    if (editing) {
      updateInvoice.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            setDialogOpen(false)
            toast({ title: 'Invoice updated' })
          },
          onError: (err) => {
            toast({ variant: 'destructive', title: 'Failed to update invoice', description: err.message })
          },
        },
      )
    } else {
      createInvoice.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false)
          toast({ title: 'Invoice created' })
        },
        onError: (err) => {
          toast({ variant: 'destructive', title: 'Failed to create invoice', description: err.message })
        },
      })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    deleteInvoice.mutate(id, {
      onSuccess: () => toast({ title: 'Invoice deleted' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Failed to delete invoice', description: err.message }),
    })
  }

  const handleRunAudit = (invoice: Invoice) => {
    setAuditingInvoiceId(invoice.id)
    runAudit.mutate(invoice.id, {
      onSuccess: (audit) => {
        toast({ title: 'Audit complete', description: `Score: ${audit.score}/100` })
        setShowAuditId(audit.id)
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Audit failed',
          description: err.message,
        })
      },
      onSettled: () => setAuditingInvoiceId(null),
    })
  }

  const isSaving = createInvoice.isPending || updateInvoice.isPending
  const auditForOpen = showAuditId ? audits.find((a) => a.id === showAuditId) : null
  const auditInvoice = auditForOpen ? invoices.find((i) => i.id === auditForOpen.invoice_id) : null
  const auditContract = auditInvoice ? contractById.get(auditInvoice.contract_id) : undefined

  if (contracts.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <PageTitle title="Invoices" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add a contract first
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Every invoice is audited against a contract. Create at least one contract before adding invoices.
            </p>
            <Button onClick={() => router.push('/paper-trail/contracts')}>
              <FileText className="w-4 h-4 mr-2" />
              Go to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Invoices"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              No invoices yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Paste invoice text, optionally attach a receipt image, then click Run Audit to compare against the
              linked contract.
            </p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const contract = contractById.get(invoice.contract_id)
            const latest = latestAuditByInvoice.get(invoice.id)
            const isAuditing = auditingInvoiceId === invoice.id
            return (
              <Card key={invoice.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      {contract?.name ?? 'Unknown contract'}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Added {new Date(invoice.created_at).toLocaleDateString()}</span>
                      {invoice.image_filename && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {invoice.image_filename}
                        </span>
                      )}
                      {latest && (
                        <Badge variant="outline">
                          Last audit: {latest.score}/100
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleRunAudit(invoice)}
                      disabled={isAuditing}
                    >
                      {isAuditing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      {isAuditing ? 'Auditing…' : 'Run Audit'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(invoice)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setPendingDelete(invoice)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground line-clamp-4">
                    {invoice.invoice_text}
                  </pre>
                  {latest && (
                    <Button variant="link" size="sm" className="px-0" onClick={() => setShowAuditId(latest.id)}>
                      View latest audit report →
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit invoice' : 'New invoice'}</DialogTitle>
            <DialogDescription>
              Paste invoice text and link it to a contract. Optionally attach a receipt image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-contract">Contract</Label>
              <Select value={form.contractId} onValueChange={(v) => updateField('contractId', v)}>
                <SelectTrigger
                  id="invoice-contract"
                  className={cn(errors.contractId && 'border-red-500 focus-visible:ring-red-500')}
                >
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contractId && <p className="text-xs text-red-500">{errors.contractId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-text">Invoice text</Label>
              <Textarea
                id="invoice-text"
                value={form.invoiceText}
                onChange={(e) => updateField('invoiceText', e.target.value)}
                placeholder="Paste the invoice contents here..."
                maxLength={TEXT_MAX}
                className={cn(
                  'min-h-[200px] font-mono text-xs',
                  errors.invoiceText && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              {errors.invoiceText && <p className="text-xs text-red-500">{errors.invoiceText}</p>}
            </div>
            <div className="space-y-2">
              <Label>Receipt image (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handleFilePick(e.target.files?.[0])}
                  disabled={uploadReceipt.isPending}
                  className="flex-1"
                />
                {form.imageFilename && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField('imageFilename', null)}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {form.imageFilename && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {form.imageFilename}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Accepted: JPEG, PNG, WebP, PDF. Max 10 MB.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Save changes' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice and all audits run on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!showAuditId} onOpenChange={(open) => !open && setShowAuditId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit report</DialogTitle>
          </DialogHeader>
          {auditForOpen && (
            <AuditReport
              audit={auditForOpen}
              invoiceLabel={
                auditInvoice ? new Date(auditInvoice.created_at).toLocaleDateString() : undefined
              }
              contractLabel={auditContract?.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
