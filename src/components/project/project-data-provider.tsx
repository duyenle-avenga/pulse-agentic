'use client'

import Link from 'next/link'
import { createContext, useContext, useMemo } from 'react'
import { toProjectHeader } from '@/lib/data/view-models'
import { useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { applyProjectDecisions } from '@/lib/progress/applyProjectDecisions'
import { deriveAcStates, type AcStatus } from '@/lib/progress/deriveAcStates'
import { ProjectShell } from './project-shell'

/** What the server loaded: a mock project, or the wizard's draft (it only exists once this browser locks v1). */
export type ProjectSource = { kind: 'project'; data: ProjectData } | { kind: 'draft'; draft: PlannerDraft }

export interface ProjectContextValue {
  /** Mock data merged with this browser's decisions. */
  data: ProjectData
  acStates: AcStatus[]
  now: IsoDateTime
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext)
  if (!value) throw new Error('useProject must be used inside ProjectDataProvider')
  return value
}

const projectIdOf = (source: ProjectSource) => (source.kind === 'project' ? source.data.project.id : source.draft.brief.projectId)

export function ProjectDataProvider({ source, now, children }: { source: ProjectSource; now: IsoDateTime; children: React.ReactNode }) {
  const decisions = useDecisions(projectIdOf(source))
  const isClient = useIsClient()

  const value = useMemo(() => {
    const base = source.kind === 'project' ? source.data : applyDecisions(source.draft, decisions)
    if (!base) return null
    const data = applyProjectDecisions(base, decisions, now)
    return { data, acStates: deriveAcStates(data), now }
  }, [source, decisions, now])

  // Mock projects render on the server with no decisions; the draft needs this browser's decisions first.
  if (source.kind === 'draft' && !isClient) return null
  if (!value) return <NotLockedYet name={source.kind === 'draft' ? source.draft.brief.name : ''} />

  return (
    <ProjectContext.Provider value={value}>
      <ProjectShell header={toProjectHeader(value.data)}>{children}</ProjectShell>
    </ProjectContext.Provider>
  )
}

function NotLockedYet({ name }: { name: string }) {
  return (
    <div className="space-y-2 py-16 text-center">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Portfolio
      </Link>
      <h1 className="text-xl font-semibold">{name}</h1>
      <p className="text-muted-foreground">{`${name}’s scope isn’t locked yet.`}</p>
      <Link href="/projects/new" className="underline">
        Open the wizard
      </Link>
    </div>
  )
}
