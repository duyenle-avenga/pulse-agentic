import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Rollup } from '@/lib/progress/rollup'
import { KpiCards } from './kpi-cards'

const rollup: Rollup = {
  total: 16,
  counts: { verified: 6, implemented: 1, pending_user_testing: 0, in_progress: 7, failing: 0, regressed: 0, not_started: 2 },
  completionPct: 38, deliveryPct: 44, unverifiedPct: 6, atRisk: 0, pendingUserTesting: 2,
  oldestPendingSince: '2026-10-13T09:00:00+02:00',
}

describe('KpiCards', () => {
  it('shows the five KPIs with their details', () => {
    render(<KpiCards rollup={rollup} now="2026-10-16T09:00:00+02:00" />)
    expect(screen.getByText('38%')).toBeInTheDocument()
    expect(screen.getByText('6 of 16 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('44%')).toBeInTheDocument()
    expect(screen.getByText('6%')).toBeInTheDocument()
    expect(screen.getByText('Oldest waiting 3 d')).toBeInTheDocument()
    expect(screen.getByText('At risk')).toBeInTheDocument()
  })

  it('says nothing is waiting when no user tests are pending', () => {
    render(<KpiCards rollup={{ ...rollup, pendingUserTesting: 0, oldestPendingSince: null }} now="2026-10-16T09:00:00+02:00" />)
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument()
  })
})
