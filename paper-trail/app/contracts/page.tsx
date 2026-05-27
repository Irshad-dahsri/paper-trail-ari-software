'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { PageTitle } from '../../components/page-title'
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from '../../hooks/use-paper-trail'
import type { Contract } from '@/modules/paper-trail/types'

interface FormState {
  name: string
  termsText: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = { name: '', termsText: '' }

const NAME_MAX = 200
const TERMS_MAX = 50000

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.name.trim()) errors.name = 'Contract name is required'
  else if (form.name.length > NAME_MAX) errors.name = `Must be ${NAME_MAX} characters or fewer`
  if (!form.termsText.trim()) errors.termsText = 'Contract terms are required'
  else if (form.termsText.length > TERMS_MAX) errors.termsText = `Must be ${TERMS_MAX.toLocaleString()} characters or fewer`
  return errors
}

export default function PaperTrailContractsPage() {
  const { toast } = useToast()
  const { data: contracts = [], isLoading } = useContracts()
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()
  const deleteContract = useDeleteContract()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pendingDelete, setPendingDelete] = useState<Contract | null>(null)

  const updateField = (field: keyof FormState, value: string) => {
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
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (contract: Contract) => {
    setEditing(contract)
    setForm({ name: contract.name, termsText: contract.terms_text })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSave = () => {
    const fieldErrors = validate(form)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const payload = { name: form.name.trim(), terms_text: form.termsText.trim() }

    if (editing) {
      updateContract.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            setDialogOpen(false)
            toast({ title: 'Contract updated' })
          },
          onError: (err) => {
            toast({ variant: 'destructive', title: 'Failed to update contract', description: err.message })
          },
        },
      )
    } else {
      createContract.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false)
          toast({ title: 'Contract created' })
        },
        onError: (err) => {
          toast({ variant: 'destructive', title: 'Failed to create contract', description: err.message })
        },
      })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    deleteContract.mutate(id, {
      onSuccess: () => toast({ title: 'Contract deleted' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Failed to delete contract', description: err.message }),
    })
  }

  const isSaving = createContract.isPending || updateContract.isPending

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Contracts"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : contracts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              No contracts yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Add a contract to capture vendor billing terms — rates, caps, expense rules — so Paper Trail can audit
              invoices against it.
            </p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first contract
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {contract.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(contract.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(contract)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setPendingDelete(contract)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground line-clamp-6">
                  {contract.terms_text}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit contract' : 'New contract'}</DialogTitle>
            <DialogDescription>
              Capture the vendor's billing terms — rates, caps, expense rules — so audits can reference them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-name">Contract name</Label>
              <Input
                id="contract-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Acme Consulting MSA 2026"
                maxLength={NAME_MAX}
                className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-terms">Billing terms</Label>
              <Textarea
                id="contract-terms"
                value={form.termsText}
                onChange={(e) => updateField('termsText', e.target.value)}
                placeholder={`e.g.\n- Hourly rate: $250/hr\n- Travel cap: $500/day\n- Receipts required for any expense over $25`}
                maxLength={TERMS_MAX}
                className={cn(
                  'min-h-[240px] font-mono text-xs',
                  errors.termsText && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              {errors.termsText && <p className="text-xs text-red-500">{errors.termsText}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Save changes' : 'Create contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{pendingDelete?.name}&quot; and all invoices and audits linked to it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
