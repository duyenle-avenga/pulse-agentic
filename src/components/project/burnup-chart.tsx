'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatDate } from '@/lib/format'
import type { BurnupPoint } from '@/lib/progress/burnup'

// Same colours as the AC state bar (globals.css --ac-*): verified = verified, delivered = implemented.
const config = {
  scope: { label: 'Scope', color: 'var(--muted-foreground)' },
  delivered: { label: 'Delivered', color: 'var(--ac-implemented)' },
  verified: { label: 'Verified', color: 'var(--ac-verified)' },
} satisfies ChartConfig

const formatDay = (day: string) => formatDate(`${day}T12:00:00Z`)

export function BurnupChart({ points }: { points: BurnupPoint[] }) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <LineChart data={points} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDay} minTickGap={24} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(day) => formatDay(String(day))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="scope" type="stepAfter" stroke="var(--color-scope)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
        <Line dataKey="delivered" type="monotone" stroke="var(--color-delivered)" strokeWidth={2} dot={false} />
        <Line dataKey="verified" type="monotone" stroke="var(--color-verified)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}
