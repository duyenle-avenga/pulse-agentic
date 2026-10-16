'use client'

import { toProjectOverview } from '@/lib/data/view-models'
import { OverviewContent } from './overview-content'
import { useProject } from './project-data-provider'

export function OverviewView() {
  const { data, now } = useProject()
  return <OverviewContent overview={toProjectOverview(data)} now={now} />
}
