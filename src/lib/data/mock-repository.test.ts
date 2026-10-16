import { describe, expect, it } from 'vitest'
import { ALL_PROJECTS } from '@/lib/mock'
import { ALL_DRAFTS } from '@/lib/mock/planner'
import { createMockRepository } from './mock-repository'

const repo = createMockRepository(ALL_PROJECTS, ALL_DRAFTS)
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 }

describe('MockRepository.getPortfolio', () => {
  it('returns one row per demo project with rolled-up numbers', async () => {
    const rows = await repo.getPortfolio()
    expect(rows.map((r) => r.id)).toEqual(['expense-tracker', 'customer-portal', 'intelligent-flow'])

    const portal = rows[1]
    expect(portal).toMatchObject({
      scopeLabel: 'v1.1', completionPct: 60, deliveryPct: 70, verified: 12, total: 20,
      openSignals: 3, highSignals: 2, pendingApprovals: 0, pendingUserTesting: 0,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
    expect(rows[0].pendingApprovals).toBe(1)
  })
})

describe('MockRepository.getProjectHeader', () => {
  it('returns header data, or null for an unknown project', async () => {
    expect(await repo.getProjectHeader('intelligent-flow')).toMatchObject({
      name: 'Intelligent Flow', board: 'jira', boardKey: 'CTOACT', scopeLabel: 'v1', approvedBy: 'Product owner',
    })
    expect(await repo.getProjectHeader('nope')).toBeNull()
  })
})

describe('MockRepository.getProjectOverview', () => {
  it('returns rollup, top signals and activity', async () => {
    const o = await repo.getProjectOverview('customer-portal')
    if (!o) throw new Error('expected an overview')
    expect(o.rollup.total).toBe(20)
    expect(o.activity).toHaveLength(10)
    expect(o.topSignals.length).toBeLessThanOrEqual(5)
    const ranks = o.topSignals.map((s) => SEVERITY_RANK[s.severity])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('returns null for an unknown project', async () => {
    expect(await repo.getProjectOverview('nope')).toBeNull()
  })

  it('orders signals by severity, then oldest first, and keeps five', async () => {
    const base = ALL_PROJECTS[0]
    const sig = (id: string, severity: 'high' | 'medium' | 'low', raisedAt: string) => ({ ...base.signals[0], id, severity, raisedAt })
    const custom = { ...base, signals: [sig('S1', 'low', '2026-10-10T09:00:00+02:00'), sig('S2', 'medium', '2026-10-12T09:00:00+02:00'), sig('S3', 'medium', '2026-10-11T09:00:00+02:00'), sig('S4', 'high', '2026-10-13T09:00:00+02:00'), sig('S5', 'low', '2026-10-09T09:00:00+02:00'), sig('S6', 'low', '2026-10-08T09:00:00+02:00')] }
    const o = await createMockRepository([custom]).getProjectOverview(base.project.id)
    expect(o?.topSignals.map((s) => s.id)).toEqual(['S4', 'S3', 'S2', 'S6', 'S5'])
  })
})

describe('MockRepository.getPlannerDraft', () => {
  it('returns the Intelligent Flow v2 draft, or null for any other id', async () => {
    const draft = await repo.getPlannerDraft('intelligent-flow-v2')
    expect(draft?.brief.name).toBe('Intelligent Flow v2')
    expect(await repo.getPlannerDraft('intelligent-flow')).toBeNull()
    expect(await repo.getPlannerDraft('nope')).toBeNull()
  })

  it('does not list drafts as projects', async () => {
    expect((await repo.getPortfolio()).map((r) => r.id)).not.toContain('intelligent-flow-v2')
    expect(await repo.getProjectHeader('intelligent-flow-v2')).toBeNull()
  })
})
