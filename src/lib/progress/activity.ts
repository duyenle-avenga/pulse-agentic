import type { IsoDateTime, ProjectData } from '@/lib/domain/types'

export type ActivityKind = 'scope_locked' | 'pr_opened' | 'pr_merged' | 'human_test' | 'scr_raised' | 'scr_decided'

export interface ActivityEvent {
  at: IsoDateTime
  kind: ActivityKind
  label: string
}

export function recentActivity(data: ProjectData, limit = 10): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const v of data.project.scopeVersions) {
    events.push({ at: v.lockedAt, kind: 'scope_locked', label: `Scope ${v.label} locked by ${v.approvedBy}` })
  }
  for (const pr of data.prs) {
    events.push({ at: pr.openedAt, kind: 'pr_opened', label: `PR #${pr.number} opened: ${pr.title}` })
    if (pr.mergedAt) events.push({ at: pr.mergedAt, kind: 'pr_merged', label: `PR #${pr.number} merged: ${pr.title}` })
  }
  for (const t of data.humanTests) {
    const outcome = t.result === 'pass' ? 'passed' : 'failed'
    events.push({ at: t.testedAt, kind: 'human_test', label: `${t.acId} human test ${outcome} (${t.tester}, ${t.environment})` })
  }
  for (const scr of data.scrs) {
    events.push({ at: scr.raisedAt, kind: 'scr_raised', label: `${scr.id} raised: ${scr.title}` })
    if (scr.status !== 'pending' && scr.decidedAt) {
      events.push({ at: scr.decidedAt, kind: 'scr_decided', label: `${scr.id} ${scr.status} by ${scr.decidedBy ?? 'unknown'}: ${scr.title}` })
    }
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit)
}
