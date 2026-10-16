import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PortfolioRow } from '@/lib/data'
import { ProjectsTable } from './projects-table'

const NOW = '2026-10-16T09:00:00+02:00'
const row: PortfolioRow = {
  id: 'intelligent-flow', name: 'Intelligent Flow', kind: 'brownfield', board: 'jira', boardKey: 'CTOACT',
  scopeLabel: 'v1', completionPct: 14, deliveryPct: 71, verified: 4, total: 28,
  openWarnings: 3, highWarnings: 1, pendingApprovals: 0, pendingUserTesting: 3,
  lastActivityAt: '2026-10-16T06:00:00+02:00',
}

describe('ProjectsTable', () => {
  it('renders a row per project with a link to its overview', () => {
    render(<ProjectsTable rows={[row]} now={NOW} />)
    expect(screen.getByRole('link', { name: 'Intelligent Flow' })).toHaveAttribute('href', '/projects/intelligent-flow')
    expect(screen.getByText('Brownfield')).toBeInTheDocument()
    expect(screen.getByText('Jira CTOACT')).toBeInTheDocument()
    expect(screen.getByText('Completion 14% · Delivery 71%')).toBeInTheDocument()
    expect(screen.getByText('4 / 28')).toBeInTheDocument()
    expect(screen.getByText('1 high')).toBeInTheDocument()
    expect(screen.getByText('3 h ago')).toBeInTheDocument()
  })

  it('shows an empty state with no projects', () => {
    render(<ProjectsTable rows={[]} now={NOW} />)
    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
  })
})
