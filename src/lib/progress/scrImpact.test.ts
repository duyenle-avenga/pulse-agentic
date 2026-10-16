import { describe, expect, it } from 'vitest'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { scrImpact } from './scrImpact'

describe('scrImpact', () => {
  it('shows what A’s CSV export would add and how completion would drop', () => {
    const impact = scrImpact(expenseTracker, expenseTracker.scrs[0])
    expect(impact).toMatchObject({ features: ['Export'], completionBefore: 35, completionAfter: 30 })
    expect(impact?.diff.map((e) => `${e.kind} ${e.id}`)).toEqual(['added F5', 'added US-5.1', 'added AC-5.1.1', 'added AC-5.1.2', 'added AC-5.1.3'])
    expect(impact?.tasks.map((t) => t.id)).toEqual(['T-08'])
  })

  it('shows B’s session warning as one changed and one added AC; the changed AC loses its old proof', () => {
    const scr2 = customerPortal.scrs.find((s) => s.id === 'SCR-2')
    if (!scr2) throw new Error('expected SCR-2')
    const impact = scrImpact(customerPortal, scr2)
    expect(impact).toMatchObject({ features: ['Sign-in'], completionBefore: 57, completionAfter: 50 })
    expect(impact?.diff).toEqual([
      { kind: 'changed', level: 'ac', id: 'AC-1.1.2', text: 'Sessions expire after 30 minutes of inactivity, with a warning 2 minutes before', before: 'Sessions expire after 30 minutes of inactivity' },
      { kind: 'added', level: 'ac', id: 'AC-1.1.4', text: 'Any activity during the warning keeps the session alive' },
    ])
  })

  it('returns null for an SCR without a proposal', () => {
    expect(scrImpact(expenseTracker, { ...expenseTracker.scrs[0], proposal: undefined })).toBeNull()
  })
})
