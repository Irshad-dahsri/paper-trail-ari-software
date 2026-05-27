'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, History, ChevronRight } from 'lucide-react'
import { PageTitle } from '../../components/page-title'
import { AuditReport } from '../../components/audit-report'
import {
  useAudits,
  useInvoices,
  useContracts,
} from '../../hooks/use-paper-trail'

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100'
  if (score >= 70) return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100'
  return 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100'
}

export default function PaperTrailAuditHistoryPage() {
  const { data: audits = [], isLoading } = useAudits()
  const { data: invoices = [] } = useInvoices()
  const { data: contracts = [] } = useContracts()
  const [openAuditId, setOpenAuditId] = useState<string | null>(null)

  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices])
  const contractById = useMemo(() => new Map(contracts.map((c) => [c.id, c])), [contracts])

  const openAudit = openAuditId ? audits.find((a) => a.id === openAuditId) : null
  const openInvoice = openAudit ? invoiceById.get(openAudit.invoice_id) : undefined
  const openContract = openInvoice ? contractById.get(openInvoice.contract_id) : undefined

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Audit History" />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : audits.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              No audits yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run an audit from the Invoices page to see results here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {audits.map((audit) => {
            const invoice = invoiceById.get(audit.invoice_id)
            const contract = invoice ? contractById.get(invoice.contract_id) : undefined
            const discrepancyCount = Array.isArray(audit.discrepancies_json)
              ? audit.discrepancies_json.length
              : 0
            return (
              <Card
                key={audit.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setOpenAuditId(audit.id)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge className={scoreBadgeClass(audit.score)} variant="outline">
                        Score {audit.score}/100
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {contract?.name ?? 'Unknown contract'}
                      </span>
                      {audit.score < 70 && (
                        <Badge variant="destructive">Action required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(audit.created_at).toLocaleString()} ·{' '}
                      {discrepancyCount === 0
                        ? 'No discrepancies'
                        : `${discrepancyCount} ${discrepancyCount === 1 ? 'discrepancy' : 'discrepancies'}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!openAuditId} onOpenChange={(open) => !open && setOpenAuditId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit report</DialogTitle>
          </DialogHeader>
          {openAudit && (
            <AuditReport
              audit={openAudit}
              invoiceLabel={
                openInvoice ? new Date(openInvoice.created_at).toLocaleDateString() : undefined
              }
              contractLabel={openContract?.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
