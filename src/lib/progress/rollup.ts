import { AC_STATES, type AcState, type IsoDateTime } from '@/lib/domain/types'
import type { AcStatus } from './deriveAcStates'

/** "Implemented or better" (spec §4.2). Failing and regressed count as risk instead. */
export const DELIVERED_STATES: ReadonlySet<AcState> = new Set<AcState>(['implemented', 'pending_user_testing', 'verified'])

export interface Rollup {
  total: number
  counts: Record<AcState, number>
  completionPct: number
  deliveryPct: number
  unverifiedPct: number
  atRisk: number
  pendingUserTesting: number
  oldestPendingSince: IsoDateTime | null
}

export function rollup(statuses: AcStatus[]): Rollup {
  const counts = Object.fromEntries(AC_STATES.map((s) => [s, 0])) as Record<AcState, number>
  for (const status of statuses) counts[status.state] += 1

  const total = statuses.length
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  const completionPct = pct(counts.verified)
  const deliveryPct = pct(statuses.filter((s) => DELIVERED_STATES.has(s.state)).length)

  const pendingSince = statuses
    .filter((s) => s.state === 'pending_user_testing')
    .map((s) => s.history.at(-1)?.at)
    .filter((at): at is IsoDateTime => at !== undefined)
    .sort((a, b) => Date.parse(a) - Date.parse(b))

  return {
    total,
    counts,
    completionPct,
    deliveryPct,
    unverifiedPct: deliveryPct - completionPct,
    atRisk: counts.failing + counts.regressed,
    pendingUserTesting: counts.pending_user_testing,
    oldestPendingSince: pendingSince[0] ?? null,
  }
}
