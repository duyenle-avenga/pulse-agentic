import type { PlannerDraft, ProjectDecisions } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'

/** Turns the planner draft plus human decisions into a normal project. Null until v1 is locked. */
export function applyDecisions(draft: PlannerDraft, decisions: ProjectDecisions): ProjectData | null {
  if (!decisions.lock) return null
  const { brief } = draft

  const features = draft.scope.features
    .map((f) => ({ ...f, stories: f.stories.filter((s) => decisions.stories[s.id] === 'approved') }))
    .filter((f) => f.stories.length > 0)
  const storyOfAc = new Map(features.flatMap((f) => f.stories.flatMap((s) => s.acs.map((a) => [a.id, s.id] as const))))
  const v1StoryIds = new Set(storyOfAc.values())

  const kept = draft.tasks
    .map((t) => ({ ...t, acIds: t.acIds.filter((id) => storyOfAc.has(id)) }))
    .filter((t) => t.acIds.length > 0)
    // A task whose own story was rejected moves to the story of its first remaining AC.
    .map((t) => (v1StoryIds.has(t.storyId) ? t : { ...t, storyId: storyOfAc.get(t.acIds[0]) ?? t.storyId }))
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
    warnings: [],
  }
}
