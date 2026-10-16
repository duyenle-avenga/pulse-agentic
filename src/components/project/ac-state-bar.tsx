import { AC_STATE_COLOR, AC_STATE_LABEL } from '@/components/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AC_STATES, type AcState } from '@/lib/domain/types'

export function AcStateBar({ counts, total }: { counts: Record<AcState, number>; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceptance criteria by state</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* gap-0.5 keeps a 2px gap between segments, so neighbours are not told apart by hue alone */}
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
          {AC_STATES.filter((s) => counts[s] > 0).map((s) => (
            <div
              key={s}
              className={AC_STATE_COLOR[s]}
              style={{ width: `${(counts[s] / total) * 100}%` }}
              title={`${AC_STATE_LABEL[s]}: ${counts[s]}`}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {AC_STATES.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${AC_STATE_COLOR[s]}`} />
              {AC_STATE_LABEL[s]}
              <span className="tabular-nums text-muted-foreground">{counts[s]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
