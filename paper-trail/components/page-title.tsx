'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useModuleEnabled } from '@/lib/modules/module-hooks'

interface Quote {
  quote: string
  author?: string
}

interface PageTitleProps {
  title: string
  actions?: React.ReactNode
}

export function PageTitle({ title, actions }: PageTitleProps) {
  const { enabled: quotesEnabled, loading: quotesLoading } = useModuleEnabled('quotes')

  const { data: quotes } = useQuery<Quote[]>({
    queryKey: ['paper-trail-quotes-pool'],
    queryFn: async () => {
      const res = await fetch('/api/modules/quotes/quotes')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: quotesEnabled && !quotesLoading,
    staleTime: 5 * 60 * 1000,
  })

  const randomQuote = useMemo(() => {
    if (!quotes || quotes.length === 0) return null
    return quotes[Math.floor(Math.random() * quotes.length)]
  }, [quotes])

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-4xl font-medium">{title}</h1>
        {quotesEnabled && randomQuote && (
          <p className="text-sm text-[#aa2020] mt-1">{randomQuote.quote}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
