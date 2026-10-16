import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PortfolioRow } from '@/lib/data'
import { PortfolioTotals } from './portfolio-totals'

const base: PortfolioRow = {
  id: 'a', name: 'A', kind: 'greenfield', board: 'none', scopeLabel: 'v1', completionPct: 0, deliveryPct: 0,
  verified: 0, total: 0, openSignals: 3, highSignals: 0, pendingApprovals: 1, pendingUserTesting: 0, lastActivityAt: null,
}

function getCard(label: string) {
  const card = screen.getByText(label).closest('[data-slot="card"]')
  if (!card) throw new Error(`No card found for label "${label}"`)
  return card as HTMLElement
}

describe('PortfolioTotals', () => {
  it('sums signals, approvals and pending user tests across projects', () => {
    render(<PortfolioTotals rows={[base, { ...base, id: 'b', highSignals: 2, pendingApprovals: 0, pendingUserTesting: 3 }]} />)
    expect(within(getCard('Projects')).getByText('2')).toBeInTheDocument()
    expect(within(getCard('Open signals')).getByText('6')).toBeInTheDocument()
    expect(screen.getByText('2 high')).toBeInTheDocument()
    expect(within(getCard('Pending approvals')).getByText('1')).toBeInTheDocument()
    expect(within(getCard('Pending user testing')).getByText('3')).toBeInTheDocument()
  })
})
