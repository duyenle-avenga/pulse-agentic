import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IsoDateTime } from '@/lib/domain/types'
import { formatRelative } from '@/lib/format'
import type { ActivityEvent } from '@/lib/progress/activity'

export function ActivityFeed({ events, now }: { events: ActivityEvent[]; now: IsoDateTime }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">Recent activity</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">{formatRelative(e.at, now)}</span>
                <span>{e.label}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
