import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityFeed } from './activity-feed'

const NOW = '2026-10-16T09:00:00+02:00'

describe('ActivityFeed', () => {
  it('lists events with their age', () => {
    render(<ActivityFeed events={[{ at: '2026-10-14T09:00:00+02:00', kind: 'pr_merged', label: 'PR #1 merged: T-1 Login' }]} now={NOW} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByText('PR #1 merged: T-1 Login')).toBeInTheDocument()
    expect(screen.getByText('2 d ago')).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    render(<ActivityFeed events={[]} now={NOW} />)
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
  })
})
