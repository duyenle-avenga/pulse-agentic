import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { expenseTracker } from '@/lib/mock/project-a'
import { PortfolioView } from './portfolio-view'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const V2 = draft.brief.projectId
const A = expenseTracker.project.id

const rowOf = (name: string) => {
  const row = screen.getByRole('link', { name }).closest('tr')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}

describe('PortfolioView', () => {
  beforeEach(() => {
    store.reset(V2)
    store.reset(A)
  })

  it('shows only mock projects while Intelligent Flow v2 is not locked', () => {
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    expect(screen.getByText('1 project')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Intelligent Flow v2' })).not.toBeInTheDocument()
  })

  it('adds Intelligent Flow v2 at 0% once v1 is locked', () => {
    store.decideAll(V2, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(V2, NOW, 'Demo approver')
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    expect(screen.getByText('2 projects')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intelligent Flow v2' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(rowOf('Intelligent Flow v2').getByText('Completion 0% · Delivery 0%')).toBeInTheDocument()
    expect(rowOf('Intelligent Flow v2').getByText('0 / 28')).toBeInTheDocument()
  })

  it('applies stored decisions to mock projects', () => {
    store.decideScr(A, 'SCR-1', { status: 'approved', decidedAt: NOW, decidedBy: 'Maya Patel', reason: 'Yes' })
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    const row = rowOf('Expense tracker')
    expect(row.getByRole('cell', { name: 'v1.1' })).toBeInTheDocument()
    expect(row.getByText('6 / 20')).toBeInTheDocument()
    expect(row.getByText('Completion 30% · Delivery 40%')).toBeInTheDocument()
  })
})
