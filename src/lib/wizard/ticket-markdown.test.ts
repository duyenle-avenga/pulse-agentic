import { describe, expect, it } from 'vitest'
import { ac } from '@/lib/mock/builders'
import { ticketMarkdown } from './ticket-markdown'

describe('ticketMarkdown', () => {
  it('renders the README §3.2 ticket format', () => {
    const task = { id: 'T-14', title: 'Dashboard: approvals', intent: 'Dashboard sign-in, the pending approvals list and the gate screen.', storyId: 'US-6.1', dependsOn: ['T-07'] }
    const acs = [ac('AC-6.1.1', 'Only signed-in internal accounts can access the dashboard'), ac('AC-3.1.5', 'An approver can understand what they’re approving from the gate screen alone, without opening the repo', true)]
    expect(ticketMarkdown(task, acs)).toBe(
      [
        'T-14 · Dashboard: approvals    Story: US-6.1 · Depends on: T-07',
        '',
        'Dashboard sign-in, the pending approvals list and the gate screen.',
        '',
        'Acceptance criteria',
        '- [ ] AC-6.1.1 Only signed-in internal accounts can access the dashboard',
        '- [ ] AC-3.1.5 An approver can understand what they’re approving from the gate screen alone, without opening the repo   👤 human test',
        '',
        'PR: put `T-14` in the title and use the standard sections (Summary, Migration,',
        'Test plan, Notes). Copy the ACs into "Test plan", tick each one you tested and',
        'say how (unit / integration / e2e). Leave 👤 items unticked for a human.',
      ].join('\n'),
    )
  })

  it('leaves out "Depends on" when there are no dependencies', () => {
    const task = { id: 'T-17', title: 'Connector testkit', intent: 'x', storyId: 'US-7.1', dependsOn: [] }
    expect(ticketMarkdown(task, []).split('\n')[0]).toBe('T-17 · Connector testkit    Story: US-7.1')
  })
})
