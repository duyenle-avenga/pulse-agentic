import { describe, expect, it } from 'vitest'
import { acsOf } from '@/lib/domain/scope'
import { burnup } from '@/lib/progress/burnup'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import { DEMO_NOW } from './clock'
import { customerPortal } from './project-b'

const statuses = deriveAcStates(customerPortal)
const r = rollup(statuses)

describe('Project B: Customer portal', () => {
  it('is brownfield on GitHub Issues', () => {
    expect(customerPortal.project.kind).toBe('brownfield')
    expect(customerPortal.project.board).toBe('github')
  })

  it('has a baseline v1 of 18 ACs and a v1.1 that adds 2', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    expect(v1.label).toBe('v1')
    expect(acsOf(v1)).toHaveLength(18)
    expect(v11.label).toBe('v1.1')
    expect(acsOf(v11)).toHaveLength(20)
  })

  it('has exactly one regressed AC', () => {
    expect(statuses.filter((s) => s.state === 'regressed').map((s) => s.acId)).toEqual(['AC-3.1.2'])
  })

  it('is 60% complete and 70% delivered', () => {
    expect(r.completionPct).toBe(60)
    expect(r.deliveryPct).toBe(70)
  })

  it('shows a scope step on the day v1.1 was locked, and scope never shrinks', () => {
    const points = burnup(customerPortal.project, statuses, DEMO_NOW)
    expect(points.find((p) => p.date === '2026-10-05')?.scope).toBe(18)
    expect(points.find((p) => p.date === '2026-10-06')?.scope).toBe(20)
    for (let i = 1; i < points.length; i++) expect(points[i].scope).toBeGreaterThanOrEqual(points[i - 1].scope)
  })

  it('has red-main, regression and ticked-but-red signals', () => {
    expect(customerPortal.signals.map((s) => s.type).sort()).toEqual(['red_main', 'regression', 'ticked_but_red'])
  })
})
