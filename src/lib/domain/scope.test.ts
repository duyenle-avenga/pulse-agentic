import { describe, expect, it } from 'vitest'
import { ac, at, feature, story } from '@/lib/mock/builders'
import type { Project } from './types'
import { acsOf, currentScope } from './scope'

const project: Project = {
  id: 'p',
  name: 'P',
  description: '',
  kind: 'greenfield',
  board: 'none',
  hasCi: true,
  scopeVersions: [
    { label: 'v1', lockedAt: at(10, 1), approvedBy: 'PO', features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'one')])])] },
    {
      label: 'v1.1',
      lockedAt: at(10, 3),
      approvedBy: 'PO',
      features: [
        feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'one'), ac('AC-2', 'two', true)])]),
        feature('F2', 'G', [story('US-2', 'T', [ac('AC-3', 'three')])]),
      ],
    },
  ],
}

describe('currentScope', () => {
  it('returns the last scope version', () => {
    expect(currentScope(project).label).toBe('v1.1')
  })

  it('throws when a project has no scope version', () => {
    expect(() => currentScope({ ...project, scopeVersions: [] })).toThrow('has no scope version')
  })
})

describe('acsOf', () => {
  it('flattens features and stories into ACs, in order', () => {
    expect(acsOf(currentScope(project)).map((a) => a.id)).toEqual(['AC-1', 'AC-2', 'AC-3'])
  })
})
