import { Card, CardContent } from '@/components/ui/card'
import { ScreenHeading } from '../screen-heading'

/** Placeholder for the embedded Metabase tab (README §4). No iframe in the POC. */
export function MetricsView() {
  return (
    <div className="space-y-4">
      <ScreenHeading title="Metrics" description="Traditional delivery KPIs from the existing Pulse platform." />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm">Pulse KPI dashboards (flow time, cycle time, throughput) from Metabase appear here.</p>
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
            Signed embedding is on the roadmap.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
