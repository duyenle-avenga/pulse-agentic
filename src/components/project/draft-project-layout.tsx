'use client'

import Link from 'next/link'
import { toProjectHeader } from '@/lib/data/view-models'
import { useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { ProjectShell } from './project-shell'

/** Project shell for the wizard project; its scope only exists once the browser's decisions lock v1. */
export function DraftProjectLayout({ draft, children }: { draft: PlannerDraft; children: React.ReactNode }) {
  const isClient = useIsClient()
  const decisions = useDecisions(draft.brief.projectId)
  if (!isClient) return null

  const data = applyDecisions(draft, decisions)
  if (!data) {
    return (
      <div className="space-y-2 py-16 text-center">
        <h1 className="text-xl font-semibold">{draft.brief.name}</h1>
        <p className="text-muted-foreground">{`${draft.brief.name}’s scope isn’t locked yet.`}</p>
        <Link href="/projects/new" className="underline">
          Open the wizard
        </Link>
      </div>
    )
  }
  return <ProjectShell header={toProjectHeader(data)}>{children}</ProjectShell>
}
