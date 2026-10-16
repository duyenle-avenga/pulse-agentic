import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { DescribeStep } from './describe-step'
import { LockedStep } from './locked-step'
import { QuestionsStep } from './questions-step'
import { ReviewStep } from './review-step'
import { Stepper } from './stepper'

const storyIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))
const all = (decision: 'approved' | 'rejected'): ProjectDecisions => ({ stories: Object.fromEntries(storyIds.map((id) => [id, decision])), lock: null })

describe('Stepper', () => {
  it('marks the current step', () => {
    render(<Stepper current={2} />)
    expect(screen.getByText('3. Review scope')).toHaveAttribute('aria-current', 'step')
  })
})

describe('DescribeStep', () => {
  it('shows the prefilled brief and a submit button that reports drafting', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<DescribeStep brief={draft.brief} drafting={false} onSubmit={onSubmit} />)
    expect(screen.getByText('Intelligent Flow v2')).toBeInTheDocument()
    expect(screen.getByText('Prefilled for the demo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    rerender(<DescribeStep brief={draft.brief} drafting onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Planner is drafting…' })).toBeDisabled()
  })
})

describe('QuestionsStep', () => {
  it('shows each question with its prefilled answer selected', () => {
    render(<QuestionsStep questions={draft.questions} drafting={false} onSubmit={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Jira and Slack' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Jira only' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'GitHub' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Submit answers' })).toBeEnabled()
  })
})

describe('ReviewStep', () => {
  const makeProps = () => ({ features: draft.scope.features, onDecide: vi.fn(), onApproveAll: vi.fn(), onLock: vi.fn() })

  it('lists every story and keeps Lock disabled until all are decided', () => {
    const props = makeProps()
    render(<ReviewStep {...props} decisions={EMPTY_DECISIONS} />)
    expect(screen.getByText('0 of 7 stories decided')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lock v1' })).toBeDisabled()
    expect(screen.getByText('Decide every story to lock v1.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reject US-4.1' }))
    expect(props.onDecide).toHaveBeenCalledWith('US-4.1', 'rejected')
    fireEvent.click(screen.getByRole('button', { name: 'Approve all' }))
    expect(props.onApproveAll).toHaveBeenCalledOnce()
  })

  it('enables Lock when every story is decided and at least one is approved', () => {
    const props = makeProps()
    render(<ReviewStep {...props} decisions={{ ...all('approved'), stories: { ...all('approved').stories, 'US-4.1': 'rejected' } }} />)
    expect(screen.getByText('7 of 7 stories decided')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve US-1.1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Lock v1' }))
    expect(props.onLock).toHaveBeenCalledOnce()
  })

  it('keeps Lock disabled when every story is rejected', () => {
    const props = makeProps()
    render(<ReviewStep {...props} decisions={all('rejected')} />)
    expect(screen.getByRole('button', { name: 'Lock v1' })).toBeDisabled()
    expect(screen.getByText('Approve at least one story to lock v1.')).toBeInTheDocument()
  })
})

describe('LockedStep', () => {
  it('shows the lock line, the generated tickets without rejected ACs, and the next actions', () => {
    const decisions = { stories: { ...all('approved').stories, 'US-4.1': 'rejected' as const }, lock: { lockedAt: '2026-10-16T09:00:00+02:00', lockedBy: 'Demo approver' } }
    const data = applyDecisions(draft, decisions)
    if (!data) throw new Error('expected data')
    const onReset = vi.fn()
    render(<LockedStep data={data} onReset={onReset} />)
    expect(screen.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Generated tasks (16)' })).toBeInTheDocument()
    expect(screen.queryByText(/AC-4\.1\.1/)).not.toBeInTheDocument()
    const t08 = screen.getByText(/^T-08 · No self-approval/).closest('[data-slot="card"]') as HTMLElement
    expect(within(t08).getByRole('button', { name: 'Copy T-08 as Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open project overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByRole('link', { name: 'Back to portfolio' })).toHaveAttribute('href', '/')
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
