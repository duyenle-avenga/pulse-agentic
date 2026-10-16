import type { ProjectOverview } from '@/lib/data/repository'
import type { IsoDateTime } from '@/lib/domain/types'
import { AcStateBar } from './ac-state-bar'
import { ActivityFeed } from './activity-feed'
import { KpiCards } from './kpi-cards'
import { SignalsList } from './signals-list'

export function OverviewContent({ overview, now }: { overview: ProjectOverview; now: IsoDateTime }) {
  return (
    <div className="space-y-6">
      <KpiCards rollup={overview.rollup} now={now} />
      <AcStateBar counts={overview.rollup.counts} total={overview.rollup.total} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SignalsList signals={overview.topSignals} now={now} />
        <ActivityFeed events={overview.activity} now={now} />
      </div>
    </div>
  )
}
