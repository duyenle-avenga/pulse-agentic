import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { Wizard } from './wizard'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()

describe('Wizard', () => {
  beforeEach(() => store.reset(draft.brief.projectId))

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
    store.lock(draft.brief.projectId, NOW, 'Demo approver')
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    expect(screen.getByRole('heading', { name: 'Generated tasks (2)' })).toBeInTheDocument()
  })
})
