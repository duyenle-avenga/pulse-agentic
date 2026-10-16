import { describe, expect, it } from 'vitest'
import { expenseTracker } from '@/lib/mock/project-a'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { at, pr, ticked } from '@/lib/mock/builders'
import { DEMO_NOW } from '@/lib/mock/clock'
import { customerPortal } from '@/lib/mock/project-b'
import { applyProjectDecisions } from './applyProjectDecisions'
import { deriveAcStates } from './deriveAcStates'
import { rollup } from './rollup'
import { scrImpact } from './scrImpact'

describe('scrImpact', () => {
  it('shows what A’s CSV export would add and how completion would drop', () => {
    const impact = scrImpact(expenseTracker, expenseTracker.scrs[0], DEMO_NOW)
    expect(impact).toMatchObject({ features: ['Export'], completionBefore: 35, completionAfter: 30 })
    expect(impact?.diff.map((e) => `${e.kind} ${e.id}`)).toEqual(['added F5', 'added US-5.1', 'added AC-5.1.1', 'added AC-5.1.2', 'added AC-5.1.3'])
    expect(impact?.tasks.map((t) => t.id)).toEqual(['T-08'])
  })

  it('shows B’s session warning as one changed and one added AC; the changed AC loses its old proof', () => {
    const scr2 = customerPortal.scrs.find((s) => s.id === 'SCR-2')
    if (!scr2) throw new Error('expected SCR-2')
    const impact = scrImpact(customerPortal, scr2, DEMO_NOW)
    expect(impact).toMatchObject({ features: ['Sign-in'], completionBefore: 57, completionAfter: 50 })
    expect(impact?.diff).toEqual([
      { kind: 'changed', level: 'ac', id: 'AC-1.1.2', text: 'Sessions expire after 30 minutes of inactivity, with a warning 2 minutes before', before: 'Sessions expire after 30 minutes of inactivity' },
      { kind: 'added', level: 'ac', id: 'AC-1.1.4', text: 'Any activity during the warning keeps the session alive' },
    ])
  })

  it('returns null for an SCR without a proposal', () => {
    expect(scrImpact(expenseTracker, { ...expenseTracker.scrs[0], proposal: undefined }, DEMO_NOW)).toBeNull()
  })

  it('agrees with approving the SCR now, even for evidence newer than the current version', () => {
    // A tick on AC-1.1.2 after v1.1 was locked still predates an approval made now.
    const retick = pr(customerPortal.project.id, { number: 109, title: 'T-01 Session tweaks', taskIds: ['T-01'], state: 'merged', openedAt: at(10, 9), mergedAt: at(10, 10), ci: 'passing', testPlan: [ticked('AC-1.1.2', 'integration')] })
    const data = { ...customerPortal, prs: [...customerPortal.prs, retick] }
    const scr2 = data.scrs.find((s) => s.id === 'SCR-2')
    if (!scr2) throw new Error('expected SCR-2')
    const applied = applyProjectDecisions(data, { ...EMPTY_DECISIONS, scrs: { 'SCR-2': { status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Lena Fischer', reason: 'ok' } } }, DEMO_NOW)
    expect(scrImpact(data, scr2, DEMO_NOW)?.completionAfter).toBe(rollup(deriveAcStates(applied)).completionPct)
  })
})
