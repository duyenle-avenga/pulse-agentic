import { describe, expect, it } from 'vitest'
import type { Feature, ScopeProposal } from '@/lib/domain/types'
import { ac, feature, story } from '@/lib/mock/builders'
import { applyProposal, nextVersionLabel } from './scopeChange'

const base: Feature[] = [
  feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login works'), ac('AC-2', 'Looks right on a phone', true)])]),
]
const empty: ScopeProposal = { addStories: [], addAcs: [], changeAcs: [], removeAcIds: [], tasks: [] }

describe('applyProposal', () => {
  it('adds a story to an existing feature', () => {
    const next = applyProposal(base, { ...empty, addStories: [{ featureId: 'F1', story: story('US-1.2', 'Sign out', [ac('AC-3', 'Ends the session')]) }] })
    expect(next).toHaveLength(1)
    expect(next[0].stories.map((s) => s.id)).toEqual(['US-1.1', 'US-1.2'])
  })

  it('adds a story in a new feature at the end, titled from featureTitle', () => {
    const next = applyProposal(base, { ...empty, addStories: [{ featureId: 'F5', featureTitle: 'Export', story: story('US-5.1', 'Export', []) }] })
    expect(next.map((f) => [f.id, f.title])).toEqual([['F1', 'Accounts'], ['F5', 'Export']])
  })

  it('adds ACs to an existing story', () => {
    const next = applyProposal(base, { ...empty, addAcs: [{ storyId: 'US-1.1', ac: ac('AC-3', 'Locks after 5 tries') }] })
    expect(next[0].stories[0].acs.map((a) => a.id)).toEqual(['AC-1', 'AC-2', 'AC-3'])
  })

  it('changes AC text and keeps the 👤 flag', () => {
    const next = applyProposal(base, { ...empty, changeAcs: [{ acId: 'AC-2', text: 'Looks right on any phone' }] })
    expect(next[0].stories[0].acs[1]).toEqual({ id: 'AC-2', text: 'Looks right on any phone', humanTest: true })
  })

  it('removes ACs', () => {
    const next = applyProposal(base, { ...empty, removeAcIds: ['AC-1'] })
    expect(next[0].stories[0].acs.map((a) => a.id)).toEqual(['AC-2'])
  })

  it('does not change its input', () => {
    const before = JSON.stringify(base)
    applyProposal(base, { ...empty, addAcs: [{ storyId: 'US-1.1', ac: ac('AC-3', 'x') }], removeAcIds: ['AC-1'] })
    expect(JSON.stringify(base)).toBe(before)
  })
})

describe('nextVersionLabel', () => {
  it('raises the minor version', () => {
    expect(nextVersionLabel('v1')).toBe('v1.1')
    expect(nextVersionLabel('v1.1')).toBe('v1.2')
    expect(nextVersionLabel('v2')).toBe('v2.1')
  })

  it('rejects labels it does not understand', () => {
    expect(() => nextVersionLabel('beta')).toThrow('Unexpected scope version label "beta"')
  })
})
