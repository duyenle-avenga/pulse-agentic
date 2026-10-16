import { currentScope } from '@/lib/domain/scope'
import type { AcceptanceCriterion, IsoDateTime, ProjectData } from '@/lib/domain/types'
import type { AcStatus } from './deriveAcStates'

export interface UserTestingItem {
  ac: AcceptanceCriterion
  storyId: string
  taskId?: string
  /** The latest merged PR that touches the AC. */
  prNumber?: number
  mergedAt?: IsoDateTime
  waitingSince: IsoDateTime
}

/** 👤 ACs whose code is merged and that wait for a human result, oldest first (README §3.2 Human testing). */
export function userTestingQueue(data: ProjectData, acStates: AcStatus[]): UserTestingItem[] {
  const located = new Map(
    currentScope(data.project).features.flatMap((f) => f.stories.flatMap((s) => s.acs.map((ac) => [ac.id, { ac, storyId: s.id }] as const))),
  )

  return acStates
    .filter((s) => s.state === 'pending_user_testing')
    .flatMap((status) => {
      const where = located.get(status.acId)
      const waitingSince = status.history.at(-1)?.at
      if (!where || !waitingSince) return []
      const taskIds = new Set(data.tasks.filter((t) => t.acIds.includes(status.acId)).map((t) => t.id))
      const merged = data.prs
        .filter((p) => p.state === 'merged' && p.mergedAt && (p.taskIds.some((id) => taskIds.has(id)) || p.testPlan.some((i) => i.acId === status.acId)))
        .sort((a, b) => Date.parse(b.mergedAt ?? '') - Date.parse(a.mergedAt ?? ''))[0]
      return [{ ...where, taskId: [...taskIds][0], prNumber: merged?.number, mergedAt: merged?.mergedAt, waitingSince }]
    })
    .sort((a, b) => Date.parse(a.waitingSince) - Date.parse(b.waitingSince))
}
