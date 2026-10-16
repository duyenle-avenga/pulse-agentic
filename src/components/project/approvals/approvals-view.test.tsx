import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { ApprovalsView } from './approvals-view'

const store = getDecisionStore()
const card = (id: string) => within(screen.getByRole('article', { name: new RegExp(`^${id} · `) }))

describe('ApprovalsView', () => {
  beforeEach(() => {
    store.reset(expenseTracker.project.id)
    store.reset(customerPortal.project.id)
  })

  it('shows a pending SCR with its impact', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    expect(screen.getByRole('heading', { level: 2, name: 'Approvals' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waiting for a decision (1)' })).toBeInTheDocument()
    const scr = card('SCR-1')
    expect(scr.getByText('Agent · PR #5 · raised 13 Oct · waiting 2 d')).toBeInTheDocument()
    expect(scr.getByText('Touches: Export')).toBeInTheDocument()
    expect(scr.getByText('Completion 35% → 30%')).toBeInTheDocument()
    expect(scr.getByText('New tasks: T-08 CSV export')).toBeInTheDocument()
    expect(scr.getAllByRole('listitem')).toHaveLength(5)
  })

  it('needs an approver and a reason', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    const scr = card('SCR-1')
    fireEvent.change(scr.getByLabelText('Approver'), { target: { value: ' ' } })
    fireEvent.click(scr.getByRole('button', { name: 'Approve SCR-1' }))
    expect(scr.getByRole('alert')).toHaveTextContent('Enter the approver’s name.Enter a reason.')
    expect(store.get(expenseTracker.project.id).scrs).toBeUndefined()
  })

  it('approving creates v1.1 and moves the card to Decided', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    const scr = card('SCR-1')
    expect(scr.getByLabelText('Approver')).toHaveValue('Maya Patel')
    fireEvent.change(scr.getByLabelText('Reason'), { target: { value: 'Accountants need it' } })
    fireEvent.click(scr.getByRole('button', { name: 'Approve SCR-1' }))

    expect(screen.getByText('Nothing waiting for approval.')).toBeInTheDocument()
    const decided = card('SCR-1')
    expect(decided.getByText('Approved by Maya Patel on 16 Oct · created v1.1')).toBeInTheDocument()
    expect(decided.getByText('Reason: Accountants need it')).toBeInTheDocument()
    expect(decided.getByRole('link', { name: 'Compare v1 → v1.1' })).toHaveAttribute('href', '/projects/expense-tracker/scope?from=v1&to=v1.1')
    expect(screen.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeInTheDocument()
  })

  it('shows decided SCRs from the mocks, newest first', () => {
    renderProject(<ApprovalsView />, customerPortal)
    expect(screen.getByRole('heading', { name: 'Decided (2)' })).toBeInTheDocument()
    expect(card('SCR-1').getByText('Approved by Lena Fischer on 6 Oct · created v1.1')).toBeInTheDocument()
    expect(card('SCR-3').getByText('Rejected by Lena Fischer on 3 Oct')).toBeInTheDocument()
    expect(card('SCR-3').getByText('Reason: Not in this release: support answers by email only.')).toBeInTheDocument()
    const titles = screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))
    expect(titles).toEqual(['SCR-2-title', 'SCR-1-title', 'SCR-3-title'])
  })

  it('rejecting keeps the scope version', () => {
    renderProject(<ApprovalsView />, customerPortal)
    const scr = card('SCR-2')
    expect(scr.getByText('Pulse · raised 14 Oct · waiting 2 d')).toBeInTheDocument()
    fireEvent.change(scr.getByLabelText('Reason'), { target: { value: 'Not now' } })
    fireEvent.click(scr.getByRole('button', { name: 'Reject SCR-2' }))
    expect(card('SCR-2').getByText('Rejected by Lena Fischer on 16 Oct')).toBeInTheDocument()
    expect(screen.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeInTheDocument()
  })
})
