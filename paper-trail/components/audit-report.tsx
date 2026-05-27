'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Copy, Check, Mail, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { AuditResult, Discrepancy, DiscrepancySeverity, DiscrepancyType } from '@/modules/paper-trail/types'

const TYPE_LABEL: Record<DiscrepancyType, string> = {
  overbilling: 'Overbilling',
  missing_receipt: 'Missing receipt',
  policy_violation: 'Policy violation',
  rate_mismatch: 'Rate mismatch',
}

const SEVERITY_BADGE: Record<DiscrepancySeverity, string> = {
  low: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100',
  medium: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100',
  high: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100',
}

function scoreTone(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

interface AuditReportProps {
  audit: AuditResult
  invoiceLabel?: string
  contractLabel?: string
}

export function AuditReport({ audit, invoiceLabel, contractLabel }: AuditReportProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const discrepancies: Discrepancy[] = Array.isArray(audit.discrepancies_json)
    ? audit.discrepancies_json
    : []

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(audit.fix_email_draft)
      setCopied(true)
      toast({ title: 'Fix Pack copied', description: 'Email draft copied to clipboard.' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not access clipboard.' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Audit Report
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(audit.created_at).toLocaleString()}
              {invoiceLabel ? ` · Invoice: ${invoiceLabel}` : ''}
              {contractLabel ? ` · Contract: ${contractLabel}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Audit Score</p>
            <p className={`text-4xl font-medium ${scoreTone(audit.score)}`}>{audit.score}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="text-sm font-medium mb-2">Discrepancies</h3>
          {discrepancies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No discrepancies detected. Invoice aligns with contract terms.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{TYPE_LABEL[d.type]}</TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_BADGE[d.severity]} variant="outline">
                        {d.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell className="text-right">
                      {typeof d.amount_impact === 'number'
                        ? `$${d.amount_impact.toFixed(2)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Fix Pack — Vendor Correction Email
            </h3>
            <Button size="sm" variant="outline" onClick={handleCopy} disabled={!audit.fix_email_draft}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied' : 'Copy to clipboard'}
            </Button>
          </div>
          {audit.fix_email_draft ? (
            <Textarea
              readOnly
              value={audit.fix_email_draft}
              className="min-h-[200px] font-mono text-xs"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No email draft was generated.</p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
