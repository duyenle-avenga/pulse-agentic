import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlow } from '@/lib/mock/project-c'
import { renderProject } from '../test-utils'
import { UserTestingView } from './user-testing-view'

const store = getDecisionStore()
const C = intelligentFlow.project.id
const queue = () => within(screen.getByRole('region', { name: /Waiting for a tester/ }))

describe('UserTestingView', () => {
  beforeEach(() => store.reset(C))

  it('lists the waiting 👤 ACs, oldest first', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    expect(screen.getByRole('heading', { level: 2, name: 'User testing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waiting for a tester (3)' })).toBeInTheDocument()
    expect(queue().getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent?.slice(0, 8))).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
    expect(queue().getByText('Story US-3.1 · T-14 · PR #206 merged 25 Sep · waiting 20 d')).toBeInTheDocument()
  })

  it('needs a result, an environment and a tester', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    fireEvent.click(screen.getByRole('button', { name: 'Record result for AC-3.1.5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose pass or fail.Enter the environment.Enter the tester’s name.')
    expect(store.get(C).humanTests).toBeUndefined()
  })

  it('saves a pass: the AC leaves the queue and appears in the recorded results', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    fireEvent.click(screen.getByRole('button', { name: 'Record result for AC-3.1.5' }))
    const form = within(screen.getByRole('form', { name: 'Record result for AC-3.1.5' }))
    fireEvent.click(form.getByLabelText('Pass'))
    fireEvent.change(form.getByLabelText('Environment'), { target: { value: 'Staging' } })
    fireEvent.change(form.getByLabelText('Tester'), { target: { value: 'Demo tester' } })
    fireEvent.click(form.getByRole('button', { name: 'Save result' }))

    expect(screen.getByRole('heading', { name: 'Waiting for a tester (2)' })).toBeInTheDocument()
    const results = within(screen.getByRole('table'))
    expect(results.getByRole('cell', { name: 'AC-3.1.5' })).toBeInTheDocument()
    expect(results.getByRole('cell', { name: 'Pass' })).toBeInTheDocument()
    expect(store.get(C).humanTests).toEqual([{ acId: 'AC-3.1.5', result: 'pass', environment: 'Staging', tester: 'Demo tester', testedAt: '2026-10-16T09:00:00+02:00' }])
  })

  it('says when nothing is waiting', () => {
    renderProject(<UserTestingView />, { ...intelligentFlow, prs: [] })
    expect(screen.getByText('No ACs are waiting for a tester.')).toBeInTheDocument()
    expect(screen.getByText('No results recorded yet.')).toBeInTheDocument()
  })
})
