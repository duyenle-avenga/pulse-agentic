import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { applyDecisions } from './applyDecisions'
import { deriveAcStates } from './deriveAcStates'

const LOCK = { lockedAt: '2026-10-16T09:00:00+02:00', lockedBy: 'Demo approver' }
const allStoryIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))
const decide = (overrides: Record<string, 'approved' | 'rejected'> = {}): ProjectDecisions => ({
  stories: { ...Object.fromEntries(allStoryIds.map((id) => [id, 'approved' as const])), ...overrides },
  lock: LOCK,
})

describe('applyDecisions', () => {
  it('returns null until v1 is locked', () => {
    expect(applyDecisions(draft, EMPTY_DECISIONS)).toBeNull()
    expect(applyDecisions(draft, { ...decide(), lock: null })).toBeNull()
  })

  it('builds a greenfield project with one locked v1 and no evidence', () => {
    const data = applyDecisions(draft, decide())
    if (!data) throw new Error('expected data')
    expect(data.project).toMatchObject({ id: 'intelligent-flow-v2', name: 'Intelligent Flow v2', kind: 'greenfield', board: 'jira', boardKey: 'CTOACT', hasCi: true })
    expect(data.project.scopeVersions).toHaveLength(1)
    expect(currentScope(data.project)).toMatchObject({ label: 'v1', lockedAt: LOCK.lockedAt, approvedBy: 'Demo approver' })
    expect(acsOf(currentScope(data.project))).toHaveLength(28)
    expect(data.tasks).toHaveLength(17)
    expect(data.tasks.every((t) => t.projectId === 'intelligent-flow-v2')).toBe(true)
    expect([data.prs, data.humanTests, data.scrs, data.signals]).toEqual([[], [], [], []])
    expect(deriveAcStates(data).every((s) => s.state === 'not_started')).toBe(true)
  })

  it('leaves out rejected stories, empty features and tasks with no ACs left', () => {
    const data = applyDecisions(draft, decide({ 'US-4.1': 'rejected' }))
    if (!data) throw new Error('expected data')
    const scope = currentScope(data.project)
    expect(scope.features.map((f) => f.id)).not.toContain('F4')
    expect(acsOf(scope).map((a) => a.id)).not.toContain('AC-4.1.1')
    expect(data.tasks.map((t) => t.id)).not.toContain('T-10')
    expect(data.tasks).toHaveLength(16)
  })

  it('trims ACs of rejected stories from shared tasks and drops dependencies on removed tasks', () => {
    const data = applyDecisions(draft, decide({ 'US-3.1': 'rejected' }))
    if (!data) throw new Error('expected data')
    const t14 = data.tasks.find((t) => t.id === 'T-14')
    expect(t14?.acIds).toEqual(['AC-6.1.1', 'AC-6.1.2'])
    expect(t14?.dependsOn).toEqual([])
    expect(data.tasks.map((t) => t.id)).not.toContain('T-07')
  })
})
