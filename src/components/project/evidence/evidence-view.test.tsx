import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { EvidenceView } from './evidence-view'

// AC cells read "AC-x.y.z", plus " 👤" for ACs that need a human tester.
// Text queries scoped to <td>, not role queries: a role query computes the accessible name and visibility of
// every cell in this ~150-cell table (15-80ms each in jsdom), which pushed this file past the 5s timeout under load.
const acCells = () => within(screen.getByRole('table')).queryAllByText(/^AC-/, { selector: 'td' })
const rowOf = (acId: string) => {
  const cell = within(screen.getByRole('table')).getByText(
    (_, el) => el?.textContent === acId || !!el?.textContent?.startsWith(`${acId} `),
    { selector: 'td' },
  )
  const row = cell.closest('tr')
  if (!row) throw new Error(`no row for ${acId}`)
  return within(row)
}
/** The "+N earlier" toggle sits in the row right after the AC's row. */
const earlierToggleOf = (acId: string) => {
  const toggleRow = rowOf(acId).getByText(acId, { exact: false, selector: 'td' }).closest('tr')?.nextElementSibling
  if (!toggleRow) throw new Error(`no toggle row for ${acId}`)
  return within(toggleRow as HTMLElement).getByRole('button', { name: /earlier/ })
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
    expect(forAc).not.toHaveAttribute('aria-controls')
    fireEvent.click(forAc)
    const revealedRow = forAc.closest('tr')?.nextElementSibling
    if (!revealedRow) throw new Error('no revealed row for AC-3.1.2')
    expect(within(revealedRow as HTMLElement).getByText('PR #103')).toBeInTheDocument()
    expect(rowOf('AC-3.1.2').queryByText('PR #103')).not.toBeInTheDocument()
  })

  it('ties the earlier-evidence toggle to the rows it reveals', () => {
    renderProject(<EvidenceView />, customerPortal)
    const toggles = screen.getAllByRole('button', { name: /earlier/ })
    const forAc = toggles.find((b) => b.closest('tr')?.previousElementSibling?.textContent?.startsWith('AC-3.1.2'))
    if (!forAc) throw new Error('no toggle for AC-3.1.2')
    fireEvent.click(forAc)
    const ids = forAc.getAttribute('aria-controls')?.split(' ').filter(Boolean) ?? []
    expect(ids).toHaveLength(1)
    for (const id of ids) expect(document.getElementById(id)).toBeInTheDocument()
    fireEvent.click(forAc)
    expect(forAc).not.toHaveAttribute('aria-controls')
  })

  it('shows an empty state when the filter matches no ACs', () => {
    getDecisionStore().reset(expenseTracker.project.id)
    renderProject(<EvidenceView />, expenseTracker)
    fireEvent.click(screen.getByRole('button', { name: 'Failing or regressed' }))
    expect(acCells()).toHaveLength(0)
    expect(screen.getByText('No ACs match this filter.')).toBeInTheDocument()
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

  it('keeps evidence from before an AC changed under “earlier”, marked as such', () => {
    getDecisionStore().decideScr(customerPortal.project.id, 'SCR-2', { status: 'approved', decidedAt: '2026-10-16T09:00:00+02:00', decidedBy: 'Lena Fischer', reason: 'Yes' })
    renderProject(<EvidenceView />, customerPortal)
    expect(rowOf('AC-1.1.2').getByText('No evidence since the AC changed')).toBeInTheDocument()
    expect(rowOf('AC-1.1.2').queryByText('PR #101')).not.toBeInTheDocument()
    const toggle = earlierToggleOf('AC-1.1.2')
    expect(toggle).toHaveTextContent('+1 earlier')
    fireEvent.click(toggle)
    const ids = toggle.getAttribute('aria-controls')?.split(' ').filter(Boolean) ?? []
    expect(ids).toHaveLength(1)
    const revealed = document.getElementById(ids[0])
    if (!revealed) throw new Error('no revealed row')
    expect(within(revealed).getByText('PR #101')).toBeInTheDocument()
    expect(within(revealed).getByText('Before the AC changed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'No evidence' }))
    expect(acCells().map((c) => c.textContent)).toContain('AC-1.1.2')
  })
})
