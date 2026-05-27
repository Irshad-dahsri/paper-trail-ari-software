'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Loader2, Eye } from 'lucide-react'
import { useAudits } from '../hooks/use-paper-trail'

export default function PaperTrailDashboardStatCard() {
  const router = useRouter()
  const { data: audits = [], isLoading } = useAudits()

  const stats = useMemo(() => {
    const total = audits.length
    const avg = total === 0 ? 0 : Math.round(audits.reduce((s, a) => s + a.score, 0) / total)
    const actionRequired = audits.filter((a) => a.score < 70).length
    return { total, avg, actionRequired }
  }, [audits])

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Paper Trail</CardTitle>
        <ShieldCheck className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-medium">{stats.total}</div>
            <p className="text-xs text-muted-foreground">audits run</p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span>
                Avg score: <span className="font-medium">{stats.avg}</span>
              </span>
              <span>
                Action required:{' '}
                <span className={`font-medium ${stats.actionRequired > 0 ? 'text-red-600' : ''}`}>
                  {stats.actionRequired}
                </span>
              </span>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => router.push('/paper-trail')}
        >
          <Eye className="w-3 h-3 mr-1" />
          View Paper Trail
        </Button>
      </CardContent>
    </Card>
  )
}
