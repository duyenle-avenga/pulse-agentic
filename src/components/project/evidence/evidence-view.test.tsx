import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { EvidenceView } from './evidence-view'

// AC cells are named "AC-x.y.z", plus " Needs a human tester" for 👤 ACs.
const acCells = () => within(screen.getByRole('table')).getAllByRole('cell', { name: /^AC-/ })
const rowOf = (acId: string) => {
  const cell = within(screen.getByRole('table')).getByRole('cell', { name: (name) => name === acId || name.startsWith(`${acId} `) })
  const row = cell.closest('tr')
  if (!row) throw new Error(`no row for ${acId}`)
  return within(row)
}

describe('EvidenceView', () => {
  beforeEach(() => getDecisionStore().reset(customerPortal.project.id))

  it('shows one row per AC with its latest evidence', () => {
    renderProject(<EvidenceView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Evidence' })).toBeInTheDocument()
    expect(acCells()).toHaveLength(21)
    const ac = rowOf('AC-3.1.2')
    expect(ac.getByText('PR #106')).toBeInTheDocument()
    expect(ac.getByText('Reported failing')).toBeInTheDocument()
    expect(ac.getByText('e2e · invoices-filter.spec.ts')).toBeInTheDocument()
    expect(ac.getByText('CI failing')).toBeInTheDocument()
    expect(rowOf('AC-2.1.4').getByText('Human test')).toBeInTheDocument()
    expect(rowOf('AC-3.1.5').getByText('No evidence yet')).toBeInTheDocument()
  })

  it('shows PR #103 as the earlier evidence of AC-3.1.2', () => {
    renderProject(<EvidenceView />, customerPortal)
    // PR #103 is also the sole (visible) evidence for AC-3.1.1 and AC-3.1.3; only AC-3.1.2's copy is hidden.
    expect(rowOf('AC-3.1.2').queryByText('PR #103')).not.toBeInTheDocument()
    expect(rowOf('AC-3.1.2').queryByRole('button')).toBeNull() // the toggle sits in the row below the AC's row
    const toggles = screen.getAllByRole('button', { name: /earlier/ })
    const forAc = toggles.find((b) => b.closest('tr')?.previousElementSibling?.textContent?.startsWith('AC-3.1.2'))
    if (!forAc) throw new Error('no toggle for AC-3.1.2')
    fireEvent.click(forAc)
    const revealedRow = forAc.closest('tr')?.nextElementSibling
    if (!revealedRow) throw new Error('no revealed row for AC-3.1.2')
    expect(within(revealedRow as HTMLElement).getByText('PR #103')).toBeInTheDocument()
    expect(rowOf('AC-3.1.2').queryByText('PR #103')).not.toBeInTheDocument()
  })

  it('filters by state and by missing evidence', () => {
    renderProject(<EvidenceView />, customerPortal)
    fireEvent.click(screen.getByRole('button', { name: 'Failing or regressed' }))
    expect(screen.getByRole('button', { name: 'Failing or regressed' })).toHaveAttribute('aria-pressed', 'true')
    expect(acCells().map((c) => c.textContent)).toEqual(['AC-3.1.2'])
    fireEvent.click(screen.getByRole('button', { name: 'No evidence' }))
    expect(acCells().length).toBeGreaterThan(0)
    for (const cell of acCells()) expect(cell.closest('tr')?.textContent).toContain('No evidence yet')
  })
})
