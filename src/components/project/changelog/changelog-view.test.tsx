import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { intelligentFlowV2 as wizardDraft } from '@/lib/mock/planner'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { renderProject } from '../test-utils'
import { ChangelogView } from './changelog-view'

const entries = () => within(screen.getByRole('list', { name: 'Changelog entries' })).getAllByRole('listitem', { name: /./ })

/** Intelligent Flow v2 once its v1 is locked, built without touching the decision store. */
function lockedWizardData() {
  const storyIds = wizardDraft.scope.features.flatMap((f) => f.stories.map((s) => s.id))
  const decisions = {
    ...EMPTY_DECISIONS,
    stories: Object.fromEntries(storyIds.map((id) => [id, 'approved' as const])),
    lock: { lockedAt: '2026-10-16T09:00:00+02:00', lockedBy: 'Demo approver' },
  }
  const data = applyDecisions(wizardDraft, decisions)
  if (!data) throw new Error('expected a locked project')
  return data
}

describe('ChangelogView', () => {
  beforeEach(() => {
    getDecisionStore().reset(customerPortal.project.id)
    getDecisionStore().reset(expenseTracker.project.id)
    getDecisionStore().reset(wizardDraft.brief.projectId)
  })

  it('names the initial entry by how v1 was made', () => {
    renderProject(<ChangelogView />, expenseTracker)
    expect(screen.getByText('Initial scope')).toBeInTheDocument()
  })

  it('names a brownfield project’s initial entry "Baseline scope"', () => {
    renderProject(<ChangelogView />, customerPortal)
    expect(screen.getByText('Baseline scope')).toBeInTheDocument()
  })

  it('names Intelligent Flow v2’s initial entry "Scope from the wizard"', () => {
    renderProject(<ChangelogView />, lockedWizardData())
    expect(screen.getByText('Scope from the wizard')).toBeInTheDocument()
  })

  it('lists versions and rejections, newest first', () => {
    renderProject(<ChangelogView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Changelog' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['v1 → v1.1', 'SCR-3 rejected, no version change', 'v1 locked'])
  })

  it('describes a version change with its SCR and diff', () => {
    renderProject(<ChangelogView />, customerPortal)
    const [version] = entries()
    const v = within(version)
    expect(v.getByText('+2 ACs')).toBeInTheDocument()
    expect(v.getByText('6 Oct 2026, 14:00 · approved by Lena Fischer')).toBeInTheDocument()
    expect(v.getByText('SCR-1 Download invoices as PDF · Agent · PR #104 · raised 30 Sep')).toBeInTheDocument()
    fireEvent.click(v.getByText('Show changes'))
    expect(v.getByText('AC AC-3.1.5')).toBeInTheDocument()
  })

  it('records a rejection made in the demo', () => {
    getDecisionStore().decideScr(customerPortal.project.id, 'SCR-2', { status: 'rejected', decidedAt: '2026-10-16T09:00:00+02:00', decidedBy: 'Lena Fischer', reason: 'Not now' })
    renderProject(<ChangelogView />, customerPortal)
    const [first] = entries()
    expect(within(first).getByRole('heading', { name: 'SCR-2 rejected, no version change' })).toBeInTheDocument()
    expect(within(first).getByText('Reason: Not now')).toBeInTheDocument()
  })
})
