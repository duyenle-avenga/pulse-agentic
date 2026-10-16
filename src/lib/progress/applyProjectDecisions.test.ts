import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS, type ScrDecision } from '@/lib/domain/planner'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { HumanTestResult, ProjectData } from '@/lib/domain/types'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { applyProjectDecisions } from './applyProjectDecisions'
import { deriveAcStates } from './deriveAcStates'
import { rollup } from './rollup'
import { acProgress, taskStatus } from './taskStatus'

const approve = (decidedAt = DEMO_NOW): ScrDecision => ({ status: 'approved', decidedAt, decidedBy: 'Maya Patel', reason: 'Accountants need it' })
const labels = (data: ProjectData) => data.project.scopeVersions.map((v) => v.label)
const stateOf = (data: ProjectData, acId: string) => deriveAcStates(data).find((s) => s.acId === acId)?.state
const tested = (result: 'pass' | 'fail'): HumanTestResult => ({ acId: 'AC-2.1.5', result, environment: 'staging', tester: 'Tom Becker', testedAt: DEMO_NOW })

describe('applyProjectDecisions', () => {
  it('without decisions, returns the mock data plus computed warnings', () => {
    const data = applyProjectDecisions(expenseTracker, EMPTY_DECISIONS, DEMO_NOW)
    expect(labels(data)).toEqual(['v1'])
    expect(data.warnings.map((w) => w.type).sort()).toEqual(['pending_decision', 'pending_user_testing', 'pr_format', 'stalled_task'])
  })

  it('applies a recorded pass: the AC is verified and nothing waits for a tester', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, humanTests: [tested('pass')] }, DEMO_NOW)
    expect(stateOf(data, 'AC-2.1.5')).toBe('verified')
    expect(data.humanTests).toHaveLength(2)
    expect(data.warnings.some((w) => w.type === 'pending_user_testing')).toBe(false)
  })

  it('applies a recorded fail: the AC is failing', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, humanTests: [tested('fail')] }, DEMO_NOW)
    expect(stateOf(data, 'AC-2.1.5')).toBe('failing')
  })

  it('approving SCR-1 creates v1.1 from its proposal and adds its task', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, scrs: { 'SCR-1': approve() } }, DEMO_NOW)
    expect(labels(data)).toEqual(['v1', 'v1.1'])
    expect(currentScope(data.project)).toMatchObject({ lockedAt: DEMO_NOW, approvedBy: 'Maya Patel', changedBy: 'SCR-1' })
    expect(acsOf(currentScope(data.project))).toHaveLength(20)
    expect(data.tasks.find((t) => t.id === 'T-08')).toMatchObject({ projectId: 'expense-tracker', storyId: 'US-5.1' })
    expect(data.scrs[0]).toMatchObject({ status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Maya Patel', decisionReason: 'Accountants need it' })
    expect(rollup(deriveAcStates(data)).completionPct).toBe(30)
    expect(data.warnings.some((w) => w.type === 'pending_decision')).toBe(false)
  })

  it('rejecting an SCR records the decision and keeps the scope', () => {
    const reject: ScrDecision = { status: 'rejected', decidedAt: DEMO_NOW, decidedBy: 'Lena Fischer', reason: 'Not now' }
    const data = applyProjectDecisions(customerPortal, { ...EMPTY_DECISIONS, scrs: { 'SCR-2': reject } }, DEMO_NOW)
    expect(labels(data)).toEqual(['v1', 'v1.1'])
    expect(data.scrs.find((s) => s.id === 'SCR-2')).toMatchObject({ status: 'rejected', decidedBy: 'Lena Fischer', decisionReason: 'Not now' })
    expect(data.tasks.map((t) => t.id)).not.toContain('T-08')
  })

  it('applies two approvals in decision order: v1.1, then v1.2', () => {
    const second = {
      ...expenseTracker.scrs[0],
      id: 'SCR-9',
      title: 'Clearer empty month',
      proposal: { addStories: [], addAcs: [], changeAcs: [{ acId: 'AC-4.1.3', text: 'An empty month says “No expenses yet”' }], removeAcIds: ['AC-4.1.5'], tasks: [] },
    }
    const base = { ...expenseTracker, scrs: [...expenseTracker.scrs, second] }
    const data = applyProjectDecisions(
      base,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': approve('2026-10-16T10:00:00+02:00'), 'SCR-9': approve('2026-10-16T09:30:00+02:00') } },
      '2026-10-16T11:00:00+02:00',
    )
    expect(data.project.scopeVersions.map((v) => [v.label, v.changedBy])).toEqual([['v1', undefined], ['v1.1', 'SCR-9'], ['v1.2', 'SCR-1']])
    const acs = acsOf(currentScope(data.project))
    expect(acs.find((a) => a.id === 'AC-4.1.3')?.text).toBe('An empty month says “No expenses yet”')
    expect(acs.map((a) => a.id)).not.toContain('AC-4.1.5')
    expect(acs).toHaveLength(19)
  })

  it('ignores stored decisions for SCRs that the mocks already decided', () => {
    const data = applyProjectDecisions(
      customerPortal,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': { ...approve(), status: 'rejected' }, 'SCR-3': approve() } },
      DEMO_NOW,
    )
    expect(data.scrs.find((s) => s.id === 'SCR-1')?.status).toBe('approved')
    expect(data.scrs.find((s) => s.id === 'SCR-3')?.status).toBe('rejected')
    expect(labels(data)).toEqual(['v1', 'v1.1'])
  })

  it('approving B’s SCR-2 changes AC-1.1.2, so PR #101’s tick no longer proves it', () => {
    const data = applyProjectDecisions(customerPortal, { ...EMPTY_DECISIONS, scrs: { 'SCR-2': approve() } }, DEMO_NOW)
    expect(labels(data)).toEqual(['v1', 'v1.1', 'v1.2'])
    expect(stateOf(data, 'AC-1.1.2')).toBe('not_started')
    expect(stateOf(data, 'AC-1.1.1')).toBe('verified')

    const stateById = new Map(deriveAcStates(data).map((s) => [s.acId, s.state]))
    const t08 = data.tasks.find((t) => t.id === 'T-08')
    if (!t08) throw new Error('expected T-08')
    expect(taskStatus(t08, data.prs, stateById)).toBe('not_started')
    expect(acProgress(t08, stateById)).toEqual({ verified: 0, total: 2 })
  })
})
