'use client'

import { toProjectOverview } from '@/lib/data/view-models'
import { useDecisions } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { OverviewContent } from './overview-content'

export function DraftOverview({ draft, now }: { draft: PlannerDraft; now: IsoDateTime }) {
  const decisions = useDecisions(draft.brief.projectId)
  const data = applyDecisions(draft, decisions)
  return data ? <OverviewContent overview={toProjectOverview(data)} now={now} /> : null
}
