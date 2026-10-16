import type { AcState, PullRequest, Task } from '@/lib/domain/types'

export type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'done'

/** Board column order. */
export const TASK_STATUSES: readonly TaskStatus[] = ['not_started', 'in_progress', 'in_review', 'done']

/** First match wins: done (all ACs verified) → in review (open PR) → in progress (any AC moved) → not started. */
export function taskStatus(task: Task, prs: PullRequest[], stateById: ReadonlyMap<string, AcState>): TaskStatus {
  const stateOf = (acId: string) => stateById.get(acId) ?? 'not_started'
  if (task.acIds.length > 0 && task.acIds.every((id) => stateOf(id) === 'verified')) return 'done'
  if (prs.some((p) => p.state === 'open' && p.taskIds.includes(task.id))) return 'in_review'
  if (task.acIds.some((id) => stateOf(id) !== 'not_started')) return 'in_progress'
  return 'not_started'
}

export function acProgress(task: Task, stateById: ReadonlyMap<string, AcState>): { verified: number; total: number } {
  return { verified: task.acIds.filter((id) => stateById.get(id) === 'verified').length, total: task.acIds.length }
}
