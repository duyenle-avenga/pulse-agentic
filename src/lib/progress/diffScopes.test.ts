import { describe, expect, it } from 'vitest'
import { ac, feature, story } from '@/lib/mock/builders'
import { customerPortal } from '@/lib/mock/project-b'
import { diffScopes, diffSummary } from './diffScopes'

const from = { features: [feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login works'), ac('AC-2', 'Wrong password fails')])])] }

describe('diffScopes', () => {
  it('is empty for identical scopes', () => {
    expect(diffScopes(from, from)).toEqual([])
  })

  it('lists added, changed and removed items by level, features first', () => {
    const to = {
      features: [
        feature('F1', 'Sign-in', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login lands on the dashboard'), ac('AC-3', 'Looks right on a phone', true)])]),
        feature('F2', 'Export', [story('US-2.1', 'Export a month', [ac('AC-4', 'Downloads a CSV')])]),
      ],
    }
    expect(diffScopes(from, to)).toEqual([
      { kind: 'changed', level: 'feature', id: 'F1', text: 'Sign-in', before: 'Accounts' },
      { kind: 'added', level: 'feature', id: 'F2', text: 'Export' },
      { kind: 'added', level: 'story', id: 'US-2.1', text: 'Export a month' },
      { kind: 'changed', level: 'ac', id: 'AC-1', text: 'Valid login lands on the dashboard', before: 'Valid login works' },
      { kind: 'added', level: 'ac', id: 'AC-3', text: 'Looks right on a phone 👤' },
      { kind: 'added', level: 'ac', id: 'AC-4', text: 'Downloads a CSV' },
      { kind: 'removed', level: 'ac', id: 'AC-2', text: 'Wrong password fails' },
    ])
  })

  it('shows project B’s v1 → v1.1 as two added ACs', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    expect(diffScopes(v1, v11)).toEqual([
      { kind: 'added', level: 'ac', id: 'AC-3.1.5', text: 'An invoice can be downloaded as a PDF' },
      { kind: 'added', level: 'ac', id: 'AC-3.1.6', text: 'The PDF matches the invoice shown on screen 👤' },
    ])
  })
})

describe('diffSummary', () => {
  it('counts additions, changes and removals', () => {
    const to = {
      features: [
        feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login lands on the dashboard')])]),
        feature('F5', 'Export', [story('US-5.1', 'Export', [ac('AC-5', 'a'), ac('AC-6', 'b'), ac('AC-7', 'c')])]),
      ],
    }
    expect(diffSummary(diffScopes(from, to))).toBe('+1 feature, +1 story, +3 ACs, 1 AC changed, −1 AC')
  })

  it('says when nothing changed', () => {
    expect(diffSummary([])).toBe('No changes')
  })
})
