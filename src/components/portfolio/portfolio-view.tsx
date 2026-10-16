'use client'

import { useMemo } from 'react'
import type { PortfolioRow } from '@/lib/data/repository'
import { toPortfolioRow } from '@/lib/data/view-models'
import { useDecisions } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { PortfolioTotals } from './portfolio-totals'
import { ProjectsTable } from './projects-table'

/** Server rows plus the wizard project once its v1 is locked (decisions live in the browser). */
export function PortfolioView({ rows, draft, now }: { rows: PortfolioRow[]; draft: PlannerDraft | null; now: IsoDateTime }) {
  const decisions = useDecisions(draft?.brief.projectId ?? '')
  const all = useMemo(() => {
    const data = draft ? applyDecisions(draft, decisions) : null
    return data ? [...rows, toPortfolioRow(data)] : rows
  }, [rows, draft, decisions])

  return (
    <>
      <PortfolioTotals rows={all} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{`${all.length} ${all.length === 1 ? 'project' : 'projects'}`}</p>
        <ProjectsTable rows={all} now={now} />
      </div>
    </>
  )
}
