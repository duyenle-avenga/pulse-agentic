import { currentScope } from '@/lib/domain/scope'
import type { IsoDateTime, ProjectData, Warning, WarningType } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import type { AcStatus } from './deriveAcStates'
import { rollup } from './rollup'

/** Warning types computed from the data, so they follow demo decisions. The other types are mock records. */
const COMPUTED: ReadonlySet<WarningType> = new Set<WarningType>(['pending_user_testing', 'pending_decision'])
const DAY_MS = 24 * 60 * 60 * 1000

export function deriveWarnings(data: ProjectData, acStates: AcStatus[], now: IsoDateTime): Warning[] {
  const projectId = data.project.id
  const warnings = data.warnings.filter((w) => !COMPUTED.has(w.type))

  const { pendingUserTesting: n, oldestPendingSince: since } = rollup(acStates)
  if (since) {
    warnings.push({
      id: 'WRN-USER-TESTING',
      projectId,
      type: 'pending_user_testing',
      severity: 'low',
      message:
        n === 1
          ? `1 👤 AC is waiting for a tester, since ${formatDate(since)}`
          : `${n} 👤 ACs are waiting for a tester, the oldest since ${formatDate(since)}`,
      suggestedAction: 'Assign a tester and start with the oldest',
      raisedAt: since,
      links: {},
    })
  }

  const approver = currentScope(data.project).approvedBy
  for (const scr of data.scrs) {
    const waited = Date.parse(now) - Date.parse(scr.raisedAt)
    if (scr.status !== 'pending' || waited <= DAY_MS) continue
    const days = Math.floor(waited / DAY_MS)
    warnings.push({
      id: `WRN-${scr.id}`,
      projectId,
      type: 'pending_decision',
      severity: 'medium',
      message: `${scr.id} (${scr.title}) has been waiting for approval for ${days} ${days === 1 ? 'day' : 'days'}`,
      suggestedAction: `Ping the approver, ${approver}`,
      raisedAt: new Date(Date.parse(scr.raisedAt) + DAY_MS).toISOString(),
      links: scr.prNumber !== undefined ? { prNumber: scr.prNumber } : {},
    })
  }
  return warnings
}
