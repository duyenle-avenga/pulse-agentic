import type { AcceptanceCriterion, ProjectData } from '@/lib/domain/types'
import { ac, at, failedItem, feature, pr, story, task, ticked, unticked } from './builders'

const P = 'customer-portal'

const signIn = feature('F1', 'Sign-in', [
  story('US-1.1', 'As a customer, I want to sign in with my company SSO, so I don’t need another password.', [
    ac('AC-1.1.1', 'SSO sign-in lands on the account home page'),
    ac('AC-1.1.2', 'Sessions expire after 30 minutes of inactivity'),
    ac('AC-1.1.3', 'Signing out clears the session in all open tabs'),
  ]),
])

const account = feature('F2', 'Company account', [
  story('US-2.1', 'As a customer admin, I want to see and update our company details, so invoices are addressed correctly.', [
    ac('AC-2.1.1', 'The account page shows company name, address and VAT ID'),
    ac('AC-2.1.2', 'Editing the address saves it and shows a confirmation'),
    ac('AC-2.1.3', 'An invalid VAT ID is rejected with a message'),
    ac('AC-2.1.4', 'The account page is readable with browser zoom at 200%', true),
  ]),
])

const invoiceAcs: AcceptanceCriterion[] = [
  ac('AC-3.1.1', 'The invoice list shows the last 24 months, newest first'),
  ac('AC-3.1.2', 'Filtering by status (paid, open, overdue) updates the list'),
  ac('AC-3.1.3', 'Overdue invoices are highlighted'),
  ac('AC-3.1.4', 'Opening an invoice shows its line items'),
]
const invoices = (acs: AcceptanceCriterion[]) =>
  feature('F3', 'Invoices', [story('US-3.1', 'As a customer, I want to see our invoices, so I can check what we owe.', acs)])

const pdfAcs: AcceptanceCriterion[] = [
  ac('AC-3.1.5', 'An invoice can be downloaded as a PDF'),
  ac('AC-3.1.6', 'The PDF matches the invoice shown on screen', true),
]

const support = feature('F4', 'Support tickets', [
  story('US-4.1', 'As a customer, I want to raise support tickets, so problems get fixed.', [
    ac('AC-4.1.1', 'Creating a ticket with a subject and description sends a confirmation email'),
    ac('AC-4.1.2', 'The ticket list shows each ticket’s status and last update'),
    ac('AC-4.1.3', 'Attachments up to 10 MB can be added to a ticket'),
    ac('AC-4.1.4', 'Customers only see their own company’s tickets'),
    ac('AC-4.1.5', 'The ticket form can be used with a screen reader', true),
  ]),
])

const notifications = feature('F5', 'Notifications', [
  story('US-5.1', 'As a billing contact, I want email notifications, so I don’t miss new invoices.', [
    ac('AC-5.1.1', 'A new invoice sends an email to the billing contacts'),
    ac('AC-5.1.2', 'Users can turn off non-essential emails'),
    ac('AC-5.1.3', 'Notification emails render correctly in Outlook and Gmail', true),
  ]),
])

export const customerPortal: ProjectData = {
  project: {
    id: P,
    name: 'Customer portal',
    description: 'Self-service portal where business customers see invoices, manage their account and raise support tickets.',
    kind: 'brownfield',
    board: 'github',
    repoUrl: 'https://github.com/example-org/customer-portal',
    hasCi: true,
    scopeVersions: [
      { label: 'v1', lockedAt: at(9, 22, 11), approvedBy: 'Lena Fischer', features: [signIn, account, invoices(invoiceAcs), support, notifications] },
      {
        label: 'v1.1',
        lockedAt: at(10, 6, 14),
        approvedBy: 'Lena Fischer',
        changedBy: 'SCR-1',
        features: [signIn, account, invoices([...invoiceAcs, ...pdfAcs]), support, notifications],
      },
    ],
  },
  tasks: [
    task(P, { id: 'T-01', title: 'SSO sign-in and sessions', storyId: 'US-1.1', acIds: ['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.3'], externalKey: '#12', agent: 'Claude Code' }),
    task(P, { id: 'T-02', title: 'Company account details', storyId: 'US-2.1', acIds: ['AC-2.1.1', 'AC-2.1.2', 'AC-2.1.3', 'AC-2.1.4'], dependsOn: ['T-01'], externalKey: '#18', agent: 'Claude Code' }),
    task(P, { id: 'T-03', title: 'Invoice list and filters', storyId: 'US-3.1', acIds: ['AC-3.1.1', 'AC-3.1.2', 'AC-3.1.3'], dependsOn: ['T-01'], externalKey: '#25', agent: 'Copilot agent' }),
    task(P, { id: 'T-04', title: 'Invoice detail', storyId: 'US-3.1', acIds: ['AC-3.1.4'], dependsOn: ['T-03'], externalKey: '#26', agent: 'Copilot agent' }),
    task(P, { id: 'T-05', title: 'Invoice PDF download', storyId: 'US-3.1', acIds: ['AC-3.1.5', 'AC-3.1.6'], dependsOn: ['T-04'], externalKey: '#47', agent: 'Claude Code' }),
    task(P, { id: 'T-06', title: 'Support tickets', storyId: 'US-4.1', acIds: ['AC-4.1.1', 'AC-4.1.2', 'AC-4.1.3', 'AC-4.1.4', 'AC-4.1.5'], dependsOn: ['T-01'], externalKey: '#31', agent: 'Claude Code' }),
    task(P, { id: 'T-07', title: 'Email notifications', storyId: 'US-5.1', acIds: ['AC-5.1.1', 'AC-5.1.2', 'AC-5.1.3'], dependsOn: ['T-03'], externalKey: '#38', agent: 'Copilot agent' }),
  ],
  prs: [
    pr(P, { number: 101, title: 'T-01 SSO sign-in and sessions', taskIds: ['T-01'], state: 'merged', openedAt: at(9, 10, 9), mergedAt: at(9, 12, 16), ci: 'passing', testPlan: [ticked('AC-1.1.1', 'e2e', 'sso.spec.ts'), ticked('AC-1.1.2', 'integration', 'session.test.ts'), ticked('AC-1.1.3', 'e2e', 'sign-out.spec.ts')] }),
    pr(P, { number: 102, title: 'T-02 Company account details', taskIds: ['T-02'], state: 'merged', openedAt: at(9, 13, 10), mergedAt: at(9, 15, 12), ci: 'passing', testPlan: [ticked('AC-2.1.1', 'e2e', 'account.spec.ts'), ticked('AC-2.1.2', 'e2e', 'account.spec.ts'), unticked('AC-2.1.3'), unticked('AC-2.1.4')] }),
    pr(P, { number: 103, title: 'T-03 Invoice list and filters', taskIds: ['T-03'], state: 'merged', openedAt: at(9, 16, 9), mergedAt: at(9, 18, 17), ci: 'passing', testPlan: [ticked('AC-3.1.1', 'e2e', 'invoices.spec.ts'), ticked('AC-3.1.2', 'e2e', 'invoices-filter.spec.ts'), ticked('AC-3.1.3', 'unit', 'invoice-row.test.ts')] }),
    pr(P, { number: 104, title: 'T-04 Invoice detail', taskIds: ['T-04'], state: 'merged', openedAt: at(9, 26, 10), mergedAt: at(9, 30, 11), ci: 'passing', testPlan: [ticked('AC-3.1.4', 'e2e', 'invoice-detail.spec.ts')], scopeChangeNotes: ['Scope change: let customers download an invoice as a PDF (needs approval)'] }),
    pr(P, { number: 105, title: 'T-06 Support tickets', taskIds: ['T-06'], state: 'merged', openedAt: at(10, 2, 9), mergedAt: at(10, 8, 15), ci: 'passing', testPlan: [ticked('AC-4.1.1', 'integration', 'tickets.test.ts'), ticked('AC-4.1.2', 'e2e', 'tickets.spec.ts'), unticked('AC-4.1.3'), ticked('AC-4.1.4', 'integration', 'ticket-access.test.ts'), unticked('AC-4.1.5')] }),
    pr(P, { number: 106, title: 'T-03 Faster invoice filtering', taskIds: ['T-03'], state: 'merged', openedAt: at(10, 11, 9), mergedAt: at(10, 15, 14), ci: 'failing', testPlan: [failedItem('AC-3.1.2', 'e2e', 'invoices-filter.spec.ts')] }),
    pr(P, { number: 107, title: 'T-05 Invoice PDF download', taskIds: ['T-05'], state: 'open', openedAt: at(10, 12, 11), ci: 'passing', testPlan: [ticked('AC-3.1.5', 'unit', 'invoice-pdf.test.ts'), unticked('AC-3.1.6')] }),
    pr(P, { number: 108, title: 'T-07 Email notifications', taskIds: ['T-07'], state: 'open', openedAt: at(10, 13, 10), ci: 'failing', testPlan: [ticked('AC-5.1.1', 'unit', 'invoice-email.test.ts'), unticked('AC-5.1.2'), unticked('AC-5.1.3')] }),
  ],
  humanTests: [
    { acId: 'AC-2.1.4', result: 'pass', environment: 'staging.portal.example', tester: 'Jonas Weber', testedAt: at(9, 24, 10), notes: 'Chrome and Edge at 200% zoom' },
  ],
  scrs: [
    {
      id: 'SCR-1', projectId: P, title: 'Download invoices as PDF', source: 'agent_pr', prNumber: 104, status: 'approved',
      raisedAt: at(9, 30, 12), decidedAt: at(10, 6, 14), decidedBy: 'Lena Fischer', rationale: 'The most requested feature in support tickets.',
      proposal: {
        addStories: [],
        addAcs: pdfAcs.map((a) => ({ storyId: 'US-3.1', ac: a })),
        changeAcs: [],
        removeAcIds: [],
        tasks: [{ id: 'T-05', title: 'Invoice PDF download', intent: '', storyId: 'US-3.1', acIds: ['AC-3.1.5', 'AC-3.1.6'], dependsOn: ['T-04'] }],
      },
    },
    {
      id: 'SCR-2', projectId: P, title: 'Warn before the session expires', source: 'pulse', status: 'pending', raisedAt: at(10, 14, 9),
      rationale: 'Pulse found that PR #101’s notes mention customers losing a half-filled form when their session expires.',
      proposal: {
        addStories: [],
        addAcs: [{ storyId: 'US-1.1', ac: ac('AC-1.1.4', 'Any activity during the warning keeps the session alive') }],
        changeAcs: [{ acId: 'AC-1.1.2', text: 'Sessions expire after 30 minutes of inactivity, with a warning 2 minutes before' }],
        removeAcIds: [],
        tasks: [
          { id: 'T-08', title: 'Session expiry warning', intent: 'Warn 2 minutes before the session expires and keep it alive on activity.', storyId: 'US-1.1', acIds: ['AC-1.1.2', 'AC-1.1.4'], dependsOn: ['T-01'] },
        ],
      },
    },
    {
      id: 'SCR-3', projectId: P, title: 'Add live chat to support tickets', source: 'human', status: 'rejected',
      raisedAt: at(10, 1, 10), decidedAt: at(10, 3, 11), decidedBy: 'Lena Fischer',
      rationale: 'Customers asked for faster answers than email.',
      decisionReason: 'Not in this release: support answers by email only.',
      proposal: {
        addStories: [
          {
            featureId: 'F4',
            story: story('US-4.2', 'As a customer, I want to chat with support, so I get answers faster.', [
              ac('AC-4.2.1', 'A chat window opens from the ticket page'),
              ac('AC-4.2.2', 'Chat messages reach the support inbox within 5 seconds'),
            ]),
          },
        ],
        addAcs: [],
        changeAcs: [],
        removeAcIds: [],
        tasks: [],
      },
    },
  ],
  warnings: [
    { id: 'WRN-1', projectId: P, type: 'red_main', severity: 'high', message: 'CI has been red on main for 19 h, since PR #106 was merged', suggestedAction: 'Assign a fix task first and stop merging other PRs', raisedAt: at(10, 15, 15), links: { prNumber: 106 } },
    { id: 'WRN-2', projectId: P, type: 'regression', severity: 'high', message: 'AC-3.1.2 was verified, and PR #106 now reports it failing', suggestedAction: 'Open a fix task linked to PR #106', raisedAt: at(10, 15, 15), links: { prNumber: 106, acId: 'AC-3.1.2', taskId: 'T-03' } },
    { id: 'WRN-3', projectId: P, type: 'ticked_but_red', severity: 'medium', message: 'PR #108 ticks AC-5.1.1, but its CI is failing', suggestedAction: 'Don’t count it as verified; ask the agent to re-run and fix', raisedAt: at(10, 15, 10), links: { prNumber: 108, acId: 'AC-5.1.1', taskId: 'T-07' } },
  ],
}
