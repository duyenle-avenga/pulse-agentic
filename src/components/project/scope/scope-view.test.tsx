import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { ScopeView } from './scope-view'

describe('ScopeView', () => {
  beforeEach(() => getDecisionStore().reset(customerPortal.project.id))

  it('shows the current version as a tree with AC states', () => {
    renderProject(<ScopeView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Scope' })).toBeInTheDocument()
    expect(screen.getByLabelText('Version')).toHaveValue('v1.1')
    expect(screen.getByText('Locked 6 Oct by Lena Fischer · from SCR-1')).toBeInTheDocument()
    expect(screen.getByText('3 of 6 verified')).toBeInTheDocument()
    const ac = screen.getByText('AC-3.1.2').closest('li')
    if (!ac) throw new Error('no AC row')
    expect(within(ac).getByText('Regressed')).toBeInTheDocument()
  })

  it('shows an older version without states', () => {
    renderProject(<ScopeView />, customerPortal)
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: 'v1' } })
    expect(screen.queryByText('AC-3.1.5')).not.toBeInTheDocument()
    expect(screen.queryByText('Regressed')).not.toBeInTheDocument()
    expect(screen.getByText('Locked 22 Sep by Lena Fischer')).toBeInTheDocument()
  })

  it('compares two versions', () => {
    renderProject(<ScopeView />, customerPortal)
    fireEvent.change(screen.getByLabelText('Compare with'), { target: { value: 'v1' } })
    const diff = within(screen.getByRole('region', { name: 'Changes from v1 to v1.1' }))
    expect(diff.getAllByRole('listitem').map((li) => li.lastElementChild?.textContent)).toEqual([
      'Added: AC AC-3.1.5 An invoice can be downloaded as a PDF',
      'Added: AC AC-3.1.6 The PDF matches the invoice shown on screen 👤',
    ])
  })

  it('opens the comparison from the URL', () => {
    renderProject(<ScopeView from="v1" to="v1.1" />, customerPortal)
    expect(screen.getByRole('region', { name: 'Changes from v1 to v1.1' })).toBeInTheDocument()
  })
})
