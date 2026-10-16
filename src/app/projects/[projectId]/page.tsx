import { notFound } from 'next/navigation'
import { AcStateBar } from '@/components/project/ac-state-bar'
import { ActivityFeed } from '@/components/project/activity-feed'
import { BurnupChart } from '@/components/project/burnup-chart'
import { KpiCards } from '@/components/project/kpi-cards'
import { SignalsList } from '@/components/project/signals-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const overview = await getRepository().getProjectOverview(projectId)
  if (!overview) notFound()
  const now = getNow()

  return (
    <div className="space-y-6">
      <KpiCards rollup={overview.rollup} now={now} />
      <AcStateBar counts={overview.rollup.counts} total={overview.rollup.total} />
      <Card>
        <CardHeader>
          <CardTitle>Burn-up by acceptance criteria</CardTitle>
          <CardDescription>Scope, delivered and verified ACs per day</CardDescription>
        </CardHeader>
        <CardContent>
          <BurnupChart points={overview.burnup} />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <SignalsList signals={overview.topSignals} now={now} />
        <ActivityFeed events={overview.activity} now={now} />
      </div>
    </div>
  )
}
