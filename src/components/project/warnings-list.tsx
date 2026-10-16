import { SEVERITY_VARIANT } from '@/components/labels'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IsoDateTime, Warning } from '@/lib/domain/types'
import { formatRelative } from '@/lib/format'

function linkText({ taskId, prNumber, acId }: Warning['links']): string {
  return [taskId, prNumber !== undefined ? `PR #${prNumber}` : undefined, acId].filter(Boolean).join(' · ')
}

export function WarningsList({ warnings, now }: { warnings: Warning[]; now: IsoDateTime }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">Top warnings</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open warnings.</p>
        ) : (
          <ul className="space-y-4">
            {warnings.map((s) => {
              const links = linkText(s.links)
              return (
                <li key={s.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[s.severity]}>{s.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{formatRelative(s.raisedAt, now)}</span>
                  </div>
                  <p className="text-sm font-medium">{s.message}</p>
                  <p className="text-sm text-muted-foreground">{`→ ${s.suggestedAction}`}</p>
                  {links && <p className="text-xs text-muted-foreground">{links}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
