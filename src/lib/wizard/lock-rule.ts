import type { ProjectDecisions } from '@/lib/domain/planner'

/** Why v1 can't be locked yet, or null when it can: every story decided and at least one approved. */
export function lockHint(storyIds: string[], decisions: ProjectDecisions): string | null {
  if (storyIds.some((id) => !decisions.stories[id])) return 'Decide every story to lock v1.'
  if (!storyIds.some((id) => decisions.stories[id] === 'approved')) return 'Approve at least one story to lock v1.'
  return null
}
