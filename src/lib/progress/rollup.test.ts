import { describe, expect, it } from 'vitest'
import type { AcState } from '@/lib/domain/types'
import type { AcStatus } from './deriveAcStates'
import { rollup } from './rollup'

let n = 0
const st = (state: AcState, at = '2026-10-10T09:00:00+02:00'): AcStatus => ({
  acId: `AC-${++n}`,
  humanTest: state === 'pending_user_testing',
  state,
  history: state === 'not_started' ? [] : [{ state, at }],
})

describe('rollup', () => {
  it('computes completion, delivery, unverified work and risk', () => {
    const r = rollup([
      st('verified'), st('verified'), st('verified'),
      st('implemented'), st('implemented'),
      st('pending_user_testing'),
      st('failing'), st('regressed'),
      st('not_started'), st('in_progress'),
    ])
    expect(r.total).toBe(10)
    expect(r.completionPct).toBe(30)
    expect(r.deliveryPct).toBe(60)
    expect(r.unverifiedPct).toBe(30)
    expect(r.atRisk).toBe(2)
    expect(r.pendingUserTesting).toBe(1)
    expect(r.counts).toEqual({
      verified: 3, implemented: 2, pending_user_testing: 1, failing: 1, regressed: 1, not_started: 1, in_progress: 1,
    })
  })

  it('rounds percentages to whole numbers', () => {
    expect(rollup([st('verified'), st('not_started'), st('not_started')]).completionPct).toBe(33)
  })

  it('returns zeros, not NaN, for an empty scope', () => {
    const r = rollup([])
    expect(r.completionPct).toBe(0)
    expect(r.deliveryPct).toBe(0)
    expect(r.oldestPendingSince).toBeNull()
  })

  it('reports when the oldest pending user test started waiting', () => {
    const r = rollup([
      st('pending_user_testing', '2026-10-12T09:00:00+02:00'),
      st('pending_user_testing', '2026-10-03T09:00:00+02:00'),
    ])
    expect(r.oldestPendingSince).toBe('2026-10-03T09:00:00+02:00')
  })
})
