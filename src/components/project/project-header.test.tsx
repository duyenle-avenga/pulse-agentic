import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import type { ProjectHeaderData } from '@/lib/data'
import { ProjectHeader } from './project-header'
import { ProjectSidebar } from './project-sidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/projects/customer-portal/scope' }))

const header: ProjectHeaderData = {
  id: 'customer-portal', name: 'Customer portal', description: 'Self-service portal.', kind: 'brownfield', board: 'github',
  repoUrl: 'https://github.com/example-org/customer-portal', scopeLabel: 'v1.1', lockedAt: '2026-10-06T14:00:00+02:00',
  approvedBy: 'Lena Fischer', pendingApprovals: 0,
}

describe('ProjectHeader', () => {
  it('shows name, scope version, lock date and approver', () => {
    render(<ProjectHeader header={header} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Customer portal' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repository' })).toHaveAttribute('href', header.repoUrl)
    expect(screen.queryByText(/pending approval/)).not.toBeInTheDocument()
  })

  it('shows a pending-approvals badge when there are any', () => {
    render(<ProjectHeader header={{ ...header, pendingApprovals: 1 }} />)
    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
  })
})

describe('ProjectSidebar', () => {
  it('links all eight screens and marks the current one', () => {
    render(<ProjectSidebar projectId="customer-portal" />)
    const names = ['Overview', 'User testing', 'Scope', 'Tasks', 'Evidence', 'Approvals', 'Changelog', 'Metrics']
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(names)
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/customer-portal')
    expect(screen.getByRole('link', { name: 'User testing' })).toHaveAttribute('href', '/projects/customer-portal/user-testing')
    expect(screen.getByRole('link', { name: 'Scope' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('soon')).not.toBeInTheDocument()
  })

  it('resets the project’s demo decisions', () => {
    const store = getDecisionStore()
    store.decideScr('customer-portal', 'SCR-2', { status: 'rejected', decidedAt: '2026-10-16T09:00:00+02:00', decidedBy: 'Lena Fischer', reason: 'No' })
    render(<ProjectSidebar projectId="customer-portal" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo decisions' }))
    expect(store.get('customer-portal').scrs).toBeUndefined()
  })

  it('has no reset for the wizard project, which resets from the wizard', () => {
    render(<ProjectSidebar projectId="intelligent-flow-v2" />)
    expect(screen.queryByRole('button', { name: 'Reset demo decisions' })).not.toBeInTheDocument()
  })
})
