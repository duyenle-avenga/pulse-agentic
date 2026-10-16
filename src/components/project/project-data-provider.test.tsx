import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { expenseTracker } from '@/lib/mock/project-a'
import { OverviewView } from './overview-view'
import { ProjectDataProvider, useProject } from './project-data-provider'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const V2 = draft.brief.projectId
const A = expenseTracker.project.id

describe('ProjectDataProvider', () => {
  beforeEach(() => {
    store.reset(V2)
    store.reset(A)
  })

  it('renders a mock project’s header, sidebar and overview', () => {
    render(<ProjectDataProvider source={{ kind: 'project', data: expenseTracker }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Expense tracker' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 6 Oct by Maya Patel/)).toBeInTheDocument()
    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
    expect(screen.getByText('6 of 17 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('SCR-1 (Add CSV export of expenses) has been waiting for approval for 2 days')).toBeInTheDocument()
  })

  it('applies stored decisions to the header and overview', () => {
    store.decideScr(A, 'SCR-1', { status: 'approved', decidedAt: NOW, decidedBy: 'Maya Patel', reason: 'Yes' })
    render(<ProjectDataProvider source={{ kind: 'project', data: expenseTracker }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeInTheDocument()
    expect(screen.queryByText('1 pending approval')).not.toBeInTheDocument()
    expect(screen.getByText('6 of 20 ACs verified')).toBeInTheDocument()
  })

  it('says Intelligent Flow v2 is not locked yet and links to the wizard', () => {
    render(<ProjectDataProvider source={{ kind: 'draft', draft }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the wizard' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: '← Portfolio' })).toHaveAttribute('href', '/')
  })

  it('shows Intelligent Flow v2 once v1 is locked', () => {
    store.decideAll(V2, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(V2, NOW, 'Demo approver')
    render(<ProjectDataProvider source={{ kind: 'draft', draft }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 16 Oct by Demo approver/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('0 of 28 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('No open warnings.')).toBeInTheDocument()
  })

  it('useProject throws outside the provider', () => {
    function Orphan() {
      useProject()
      return null
    }
    expect(() => render(<Orphan />)).toThrow('useProject must be used inside ProjectDataProvider')
  })
})
