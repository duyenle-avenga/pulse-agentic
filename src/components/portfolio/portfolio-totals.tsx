import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PortfolioRow } from '@/lib/data'

export function PortfolioTotals({ rows }: { rows: PortfolioRow[] }) {
  const sum = (pick: (r: PortfolioRow) => number) => rows.reduce((n, r) => n + pick(r), 0)
  const items = [
    { label: 'Projects', value: rows.length },
    { label: 'Open signals', value: sum((r) => r.openSignals), detail: `${sum((r) => r.highSignals)} high` },
    { label: 'Pending approvals', value: sum((r) => r.pendingApprovals) },
    { label: 'Pending user testing', value: sum((r) => r.pendingUserTesting) },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{item.value}</CardTitle>
            {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
