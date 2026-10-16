import { currentScope } from '@/lib/domain/scope'
import type { ProjectData, ScopeChangeRequest, Task } from '@/lib/domain/types'
import { deriveAcStates } from './deriveAcStates'
import { diffScopes, type ScopeDiffEntry } from './diffScopes'
import { rollup } from './rollup'
import { applyProposal, nextVersionLabel } from './scopeChange'

export interface ScrImpact {
  diff: ScopeDiffEntry[]
  /** Titles of the features the change touches. */
  features: string[]
  tasks: Omit<Task, 'projectId'>[]
  completionBefore: number
  completionAfter: number
}

/** What approving a pending SCR would change (README §3.4 impact analysis). Null without a proposal. */
export function scrImpact(data: ProjectData, scr: ScopeChangeRequest): ScrImpact | null {
  if (!scr.proposal) return null
  const current = currentScope(data.project)
  const features = applyProposal(current.features, scr.proposal)
  const after: ProjectData = {
    ...data,
    project: { ...data.project, scopeVersions: [...data.project.scopeVersions, { ...current, label: nextVersionLabel(current.label), features }] },
    tasks: [...data.tasks, ...scr.proposal.tasks.map((t) => ({ ...t, projectId: data.project.id }))],
  }

  const diff = diffScopes(current, { features })
  const touched = new Set(diff.map((e) => e.id))
  const titles = [...features, ...current.features]
    .filter((f) => touched.has(f.id) || f.stories.some((s) => touched.has(s.id) || s.acs.some((a) => touched.has(a.id))))
    .map((f) => f.title)

  return {
    diff,
    features: [...new Set(titles)],
    tasks: scr.proposal.tasks,
    completionBefore: rollup(deriveAcStates(data)).completionPct,
    completionAfter: rollup(deriveAcStates(after)).completionPct,
  }
}
