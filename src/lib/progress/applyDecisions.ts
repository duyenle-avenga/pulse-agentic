import type { PlannerDraft, ProjectDecisions } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'

/** Turns the planner draft plus human decisions into a normal project. Null until v1 is locked. */
export function applyDecisions(draft: PlannerDraft, decisions: ProjectDecisions): ProjectData | null {
  if (!decisions.lock) return null
  const { brief } = draft

  const features = draft.scope.features
    .map((f) => ({ ...f, stories: f.stories.filter((s) => decisions.stories[s.id] === 'approved') }))
    .filter((f) => f.stories.length > 0)
  const v1AcIds = new Set(features.flatMap((f) => f.stories.flatMap((s) => s.acs.map((a) => a.id))))

  const kept = draft.tasks
    .map((t) => ({ ...t, acIds: t.acIds.filter((id) => v1AcIds.has(id)) }))
    .filter((t) => t.acIds.length > 0)
  const keptIds = new Set(kept.map((t) => t.id))

  return {
    project: {
      id: brief.projectId,
      name: brief.name,
      description: brief.goal,
      kind: 'greenfield',
      board: brief.board,
      boardKey: brief.boardKey,
      repoUrl: brief.repoUrl,
      hasCi: true,
      scopeVersions: [{ label: 'v1', lockedAt: decisions.lock.lockedAt, approvedBy: decisions.lock.lockedBy, features }],
    },
    tasks: kept.map((t) => ({ ...t, projectId: brief.projectId, dependsOn: t.dependsOn.filter((id) => keptIds.has(id)) })),
    prs: [],
    humanTests: [],
    scrs: [],
    signals: [],
  }
}
