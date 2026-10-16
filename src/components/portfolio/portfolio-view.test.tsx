import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PortfolioRow } from '@/lib/data'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { PortfolioView } from './portfolio-view'

const NOW = '2026-10-16T09:00:00+02:00'
const row: PortfolioRow = {
  id: 'a', name: 'Project A', kind: 'greenfield', board: 'none', scopeLabel: 'v1', completionPct: 10, deliveryPct: 20,
  verified: 1, total: 10, openWarnings: 0, highWarnings: 0, pendingApprovals: 0, pendingUserTesting: 0, lastActivityAt: null,
}
const store = getDecisionStore()
const P = draft.brief.projectId

describe('PortfolioView', () => {
  beforeEach(() => store.reset(P))

  it('shows only server projects while Intelligent Flow v2 is not locked', () => {
    render(<PortfolioView rows={[row]} draft={draft} now={NOW} />)
    expect(screen.getByText('1 project')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Intelligent Flow v2' })).not.toBeInTheDocument()
  })

  it('adds Intelligent Flow v2 at 0% once v1 is locked', () => {
    store.decideAll(P, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(P, NOW, 'Demo approver')
    render(<PortfolioView rows={[row]} draft={draft} now={NOW} />)
    expect(screen.getByText('2 projects')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intelligent Flow v2' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('Completion 0% · Delivery 0%')).toBeInTheDocument()
    expect(screen.getByText('0 / 28')).toBeInTheDocument()
  })
})
