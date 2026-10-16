import { describe, expect, it } from 'vitest'
import type { AcceptanceCriterion, Project, ScopeVersion } from '@/lib/domain/types'
import { ac, at, feature, story } from '@/lib/mock/builders'
import { evidenceCutoffs } from './evidenceCutoff'

const version = (label: string, day: number, acs: AcceptanceCriterion[]): ScopeVersion => ({
  label, lockedAt: at(10, day), approvedBy: 'PO', features: [feature('F1', 'F', [story('US-1', 'S', acs)])],
})
const projectWith = (...scopeVersions: ScopeVersion[]): Project => ({
  id: 'p', name: 'P', description: '', kind: 'greenfield', board: 'none', hasCi: true, scopeVersions,
})

describe('evidenceCutoffs', () => {
  it('is empty for a single version', () => {
    expect(evidenceCutoffs(projectWith(version('v1', 1, [ac('AC-1', 'a')])))).toEqual(new Map())
  })

  it('cuts off an AC whose text changed at the version that changed it', () => {
    const p = projectWith(version('v1', 1, [ac('AC-1', 'a'), ac('AC-2', 'b')]), version('v2', 5, [ac('AC-1', 'a, but more'), ac('AC-2', 'b')]))
    expect(evidenceCutoffs(p)).toEqual(new Map([['AC-1', at(10, 5)]]))
  })

  it('ignores added ACs and a changed 👤 flag', () => {
    const p = projectWith(version('v1', 1, [ac('AC-1', 'a')]), version('v2', 5, [ac('AC-1', 'a', true), ac('AC-2', 'new')]))
    expect(evidenceCutoffs(p)).toEqual(new Map())
  })

  it('uses the latest change when an AC changed in several versions', () => {
    const p = projectWith(
      version('v1', 1, [ac('AC-1', 'a')]),
      version('v2', 5, [ac('AC-1', 'a2')]),
      version('v3', 7, [ac('AC-1', 'a2'), ac('AC-2', 'b')]),
      version('v4', 9, [ac('AC-1', 'a3'), ac('AC-2', 'b')]),
    )
    expect(evidenceCutoffs(p)).toEqual(new Map([['AC-1', at(10, 9)]]))
  })

  it('treats an AC that comes back with new text as changed', () => {
    const p = projectWith(version('v1', 1, [ac('AC-1', 'a')]), version('v2', 5, []), version('v3', 7, [ac('AC-1', 'a2')]))
    expect(evidenceCutoffs(p)).toEqual(new Map([['AC-1', at(10, 7)]]))
  })
})
