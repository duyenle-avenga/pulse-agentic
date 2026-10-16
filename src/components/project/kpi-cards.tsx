import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { IsoDateTime } from '@/lib/domain/types'
import { formatDuration } from '@/lib/format'
import type { Rollup } from '@/lib/progress/rollup'

export function KpiCards({ rollup: r, now }: { rollup: Rollup; now: IsoDateTime }) {
  const cards = [
    { label: 'Completion', value: `${r.completionPct}%`, detail: `${r.counts.verified} of ${r.total} ACs verified` },
    { label: 'Delivery', value: `${r.deliveryPct}%`, detail: 'Implemented or better' },
    { label: 'Unverified work', value: `${r.unverifiedPct}%`, detail: 'Delivered but not yet proven' },
    {
      label: 'Pending user testing',
      value: String(r.pendingUserTesting),
      detail: r.oldestPendingSince ? `Oldest waiting ${formatDuration(r.oldestPendingSince, now)}` : 'Nothing waiting',
    },
    { label: 'At risk', value: String(r.atRisk), detail: 'Failing or regressed ACs' },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader>
            <CardDescription>{c.label}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{c.value}</CardTitle>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
