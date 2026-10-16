import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PortfolioRow } from '@/lib/data'
import { PortfolioTotals } from './portfolio-totals'

const base: PortfolioRow = {
  id: 'a', name: 'A', kind: 'greenfield', board: 'none', scopeLabel: 'v1', completionPct: 0, deliveryPct: 0,
  verified: 0, total: 0, openSignals: 3, highSignals: 0, pendingApprovals: 1, pendingUserTesting: 0, lastActivityAt: null,
}

describe('PortfolioTotals', () => {
  it('sums signals, approvals and pending user tests across projects', () => {
    render(<PortfolioTotals rows={[base, { ...base, id: 'b', highSignals: 2, pendingApprovals: 0, pendingUserTesting: 3 }]} />)
    expect(screen.getByText('Projects').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Open signals').nextSibling).toHaveTextContent('6')
    expect(screen.getByText('2 high')).toBeInTheDocument()
    expect(screen.getByText('Pending approvals').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Pending user testing').nextSibling).toHaveTextContent('3')
  })
})
