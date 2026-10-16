import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { currentScope } from '@/lib/domain/scope'
import type { IsoDateTime, ProjectData, ScopeChangeRequest, Task } from '@/lib/domain/types'
import { applyProjectDecisions } from './applyProjectDecisions'
import { deriveAcStates } from './deriveAcStates'
import { diffScopes, type ScopeDiffEntry } from './diffScopes'
import { rollup } from './rollup'

export interface ScrImpact {
  diff: ScopeDiffEntry[]
  /** Titles of the features the change touches. */
  features: string[]
  tasks: Omit<Task, 'projectId'>[]
  completionBefore: number
  completionAfter: number
}

/**
 * What approving a pending SCR now would change (README §3.4 impact analysis). Null without a proposal.
 * Built with applyProjectDecisions, so the preview matches what an approval produces.
 */
export function scrImpact(data: ProjectData, scr: ScopeChangeRequest, now: IsoDateTime): ScrImpact | null {
  if (!scr.proposal) return null
  const approval = { status: 'approved' as const, decidedAt: now, decidedBy: 'Impact preview', reason: '' }
  const after = applyProjectDecisions(data, { ...EMPTY_DECISIONS, scrs: { [scr.id]: approval } }, now)
  const current = currentScope(data.project)
  const next = currentScope(after.project)

  const diff = diffScopes(current, next)
  const touched = new Set(diff.map((e) => e.id))
  const titles = [...next.features, ...current.features]
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
