import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { Wizard } from './wizard'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()

describe('Wizard', () => {
  beforeEach(() => store.reset(draft.brief.projectId))
  afterEach(() => vi.useRealTimers())

  it('walks from the brief to a locked v1 and can be reset', async () => {
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit answers' }))
    await screen.findByText('Review the generated scope')

    fireEvent.click(screen.getByRole('button', { name: 'Reject US-4.1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lock v1' }))

    expect(await screen.findByText('Scope v1 · locked 16 Oct by Demo approver')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Generated tasks (16)' })).toBeInTheDocument()
    expect(store.get(draft.brief.projectId).lock).toEqual({ lockedAt: NOW, lockedBy: 'Demo approver' })

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(await screen.findByRole('button', { name: 'Submit to planner' })).toBeInTheDocument()
    expect(store.get(draft.brief.projectId).lock).toBeNull()
  })

  it('opens on the locked step when v1 is already locked', () => {
    store.decideAll(draft.brief.projectId, ['US-1.1'], 'approved')
    store.decideAll(draft.brief.projectId, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'rejected')
    store.lock(draft.brief.projectId, NOW, 'Demo approver')
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    expect(screen.getByRole('heading', { name: 'Generated tasks (2)' })).toBeInTheDocument()
  })
  it('shows the planner drafting for the default delay, then the next step', () => {
    vi.useFakeTimers()
    render(<Wizard draft={draft} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))

    expect(screen.getByRole('button', { name: 'Planner is drafting…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Planner is drafting…')

    act(() => vi.advanceTimersByTime(899))
    expect(screen.queryByRole('button', { name: 'Submit answers' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'Submit answers' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('clears a pending drafting timer on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = render(<Wizard draft={draft} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('moves focus to the new step heading, but not on first render', async () => {
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    expect(document.body).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'The planner has a few questions' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Review the generated scope' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Approve all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lock v1' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Scope v1 locked' })).toHaveFocus()
  })
})
