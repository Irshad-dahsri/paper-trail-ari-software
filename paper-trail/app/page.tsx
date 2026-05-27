'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Receipt, History, ShieldCheck, AlertTriangle, ScrollText } from 'lucide-react'
import { PageTitle } from '../components/page-title'
import { AuditReport } from '../components/audit-report'
import {
  useContracts,
  useInvoices,
  useAudits,
} from '../hooks/use-paper-trail'

export default function PaperTrailOverviewPage() {
  const router = useRouter()
  const { data: contracts = [] } = useContracts()
  const { data: invoices = [] } = useInvoices()
  const { data: audits = [] } = useAudits()

  const stats = useMemo(() => {
    const total = audits.length
    const avg = total === 0 ? 0 : Math.round(audits.reduce((s, a) => s + a.score, 0) / total)
    const actionRequired = audits.filter((a) => a.score < 70).length
    return { total, avg, actionRequired }
  }, [audits])

  const latestAudit = audits[0]
  const latestInvoice = latestAudit ? invoices.find((i) => i.id === latestAudit.invoice_id) : undefined
  const latestContract = latestInvoice
    ? contracts.find((c) => c.id === latestInvoice.contract_id)
    : undefined

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Paper Trail"
        actions={
          <>
            <Button variant="outline" onClick={() => (router.push('/paper-trail/contracts'))}>
              <FileText className="w-4 h-4 mr-2" />
              Contracts
            </Button>
            <Button onClick={() => (router.push('/paper-trail/invoices'))}>
              <Receipt className="w-4 h-4 mr-2" />
              Invoices
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Contracts" value={contracts.length} icon={<FileText className="w-4 h-4" />} />
        <StatCard label="Invoices" value={invoices.length} icon={<Receipt className="w-4 h-4" />} />
        <StatCard
          label="Audits Run"
          value={stats.total}
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Action Required"
          value={stats.actionRequired}
          icon={<AlertTriangle className="w-4 h-4" />}
          tone={stats.actionRequired > 0 ? 'text-red-600' : undefined}
        />
      </div>

      {latestAudit ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Latest Audit
          </h2>
          <AuditReport
            audit={latestAudit}
            invoiceLabel={latestInvoice ? new Date(latestInvoice.created_at).toLocaleDateString() : undefined}
            contractLabel={latestContract?.name}
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Get started
            </CardTitle>
            <CardDescription>
              Paper Trail audits your invoices against contract terms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Add a contract with billing terms (rates, caps, expense rules).</p>
            <p>2. Paste an invoice and optionally attach a receipt image.</p>
            <p>3. Run an audit — Claude cross-references the invoice against the contract.</p>
            <div className="flex gap-2 pt-3">
              <Button onClick={() => (router.push('/paper-trail/contracts'))}>
                <FileText className="w-4 h-4 mr-2" />
                Add a contract
              </Button>
              <Button variant="outline" onClick={() => (router.push('/paper-trail/invoices'))}>
                <Receipt className="w-4 h-4 mr-2" />
                Add an invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  tone?: string
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-medium ${tone ?? ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
