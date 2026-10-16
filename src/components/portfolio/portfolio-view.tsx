'use client'

import { useMemo } from 'react'
import { toPortfolioRow } from '@/lib/data/view-models'
import { useAllDecisions } from '@/lib/decisions/use-decisions'
import { EMPTY_DECISIONS, type PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { applyProjectDecisions } from '@/lib/progress/applyProjectDecisions'
import { PortfolioTotals } from './portfolio-totals'
import { ProjectsTable } from './projects-table'

/** Mock projects plus the wizard project once its v1 is locked, each merged with this browser's decisions. */
export function PortfolioView({ projects, draft, now }: { projects: ProjectData[]; draft: PlannerDraft | null; now: IsoDateTime }) {
  const all = useAllDecisions()
  const rows = useMemo(() => {
    const decisionsOf = (id: string) => all[id] ?? EMPTY_DECISIONS
    const merged = projects.map((p) => applyProjectDecisions(p, decisionsOf(p.project.id), now))
    const draftData = draft ? applyDecisions(draft, decisionsOf(draft.brief.projectId)) : null
    if (draftData) merged.push(applyProjectDecisions(draftData, decisionsOf(draftData.project.id), now))
    return merged.map(toPortfolioRow)
  }, [projects, draft, all, now])

  return (
    <>
      <PortfolioTotals rows={rows} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{`${rows.length} ${rows.length === 1 ? 'project' : 'projects'}`}</p>
        <ProjectsTable rows={rows} now={now} />
      </div>
    </>
  )
}
