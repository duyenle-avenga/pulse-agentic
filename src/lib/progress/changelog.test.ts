import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { applyProjectDecisions } from './applyProjectDecisions'
import { changelog } from './changelog'
import { diffSummary } from './diffScopes'

describe('changelog', () => {
  it('lists versions and rejections newest first', () => {
    const entries = changelog(customerPortal)
    expect(entries.map((e) => [e.kind, e.at])).toEqual([
      ['version', '2026-10-06T14:00:00+02:00'],
      ['rejected', '2026-10-03T11:00:00+02:00'],
      ['initial', '2026-09-22T11:00:00+02:00'],
    ])
  })

  it('describes a new version with its SCR and diff', () => {
    const [entry] = changelog(customerPortal)
    if (entry.kind !== 'version') throw new Error('expected a version entry')
    expect(entry).toMatchObject({ from: 'v1', to: 'v1.1', approvedBy: 'Lena Fischer' })
    expect(entry.scr?.id).toBe('SCR-1')
    expect(diffSummary(entry.diff)).toBe('+2 ACs')
  })

  it('describes the initial version and a rejection', () => {
    const entries = changelog(customerPortal)
    expect(entries[2]).toEqual({ kind: 'initial', at: '2026-09-22T11:00:00+02:00', version: 'v1', approvedBy: 'Lena Fischer' })
    expect(entries[1].kind === 'rejected' && entries[1].scr.id).toBe('SCR-3')
  })

  it('includes decisions made in the demo', () => {
    const decided = applyProjectDecisions(
      expenseTracker,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': { status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Maya Patel', reason: 'Yes' } } },
      DEMO_NOW,
    )
    const [entry] = changelog(decided)
    if (entry.kind !== 'version') throw new Error('expected a version entry')
    expect([entry.from, entry.to, entry.at]).toEqual(['v1', 'v1.1', DEMO_NOW])
    expect(diffSummary(entry.diff)).toBe('+1 feature, +1 story, +3 ACs')
  })
})
