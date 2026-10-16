import type { ProjectData } from '@/lib/domain/types'
import { ac, at, feature, pr, story, task, ticked, unticked } from './builders'

const P = 'expense-tracker'

export const expenseTracker: ProjectData = {
  project: {
    id: P,
    name: 'Expense tracker',
    description: 'A small web app for recording personal expenses, attaching receipts and seeing monthly totals.',
    kind: 'greenfield',
    board: 'none',
    hasCi: true,
    scopeVersions: [
      {
        label: 'v1',
        lockedAt: at(10, 6, 10),
        approvedBy: 'Maya Patel',
        features: [
          feature('F1', 'Accounts', [
            story('US-1.1', 'As a user, I want to sign up and sign in, so my expenses stay private.', [
              ac('AC-1.1.1', 'Signing up with email and password creates an account and signs the user in'),
              ac('AC-1.1.2', 'A wrong password shows an error and creates no session'),
              ac('AC-1.1.3', 'Signed-out users are redirected to the sign-in page'),
              ac('AC-1.1.4', 'The sign-in page looks right on a phone', true),
            ]),
          ]),
          feature('F2', 'Expenses', [
            story('US-2.1', 'As a user, I want to record my expenses, so I know where my money goes.', [
              ac('AC-2.1.1', 'Adding an expense with amount, date and category saves it and shows it in the list'),
              ac('AC-2.1.2', 'The amount must be positive; invalid input shows an inline error'),
              ac('AC-2.1.3', 'Editing an expense updates the list and the totals'),
              ac('AC-2.1.4', 'Deleting an expense asks for confirmation first'),
              ac('AC-2.1.5', 'The expense list is easy to scan on a phone', true),
            ]),
          ]),
          feature('F3', 'Receipts', [
            story('US-3.1', 'As a user, I want to attach a photo of the receipt, so I have proof of the expense.', [
              ac('AC-3.1.1', 'A JPG or PNG under 5 MB can be attached to an expense'),
              ac('AC-3.1.2', 'Larger files or other formats are rejected with a message'),
              ac('AC-3.1.3', 'The receipt thumbnail is readable on a phone', true),
            ]),
          ]),
          feature('F4', 'Monthly report', [
            story('US-4.1', 'As a user, I want a monthly summary, so I can see where I overspend.', [
              ac('AC-4.1.1', 'The monthly view shows the total per category'),
              ac('AC-4.1.2', 'Switching month updates the totals'),
              ac('AC-4.1.3', 'A month with no expenses shows an empty state'),
              ac('AC-4.1.4', 'Chart colours are distinguishable for colour-blind users', true),
              ac('AC-4.1.5', 'Totals are shown in the user’s currency'),
            ]),
          ]),
        ],
      },
    ],
  },
  tasks: [
    task(P, { id: 'T-01', title: 'Sign-up and sign-in', intent: 'Email and password accounts with bcrypt hashing and a session cookie.', storyId: 'US-1.1', acIds: ['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.4'], agent: 'Claude Code' }),
    task(P, { id: 'T-02', title: 'Protect signed-in pages', intent: 'Redirect signed-out users to the sign-in page.', storyId: 'US-1.1', acIds: ['AC-1.1.3'], dependsOn: ['T-01'], agent: 'Claude Code' }),
    task(P, { id: 'T-03', title: 'Expense list, add, edit and delete', intent: 'CRUD for expenses with a list view and running totals.', storyId: 'US-2.1', acIds: ['AC-2.1.1', 'AC-2.1.3', 'AC-2.1.4', 'AC-2.1.5'], dependsOn: ['T-01'], agent: 'Cursor agent' }),
    task(P, { id: 'T-04', title: 'Validate expense input', intent: 'Reject non-positive amounts with an inline error.', storyId: 'US-2.1', acIds: ['AC-2.1.2'], dependsOn: ['T-03'], agent: 'Cursor agent' }),
    task(P, { id: 'T-05', title: 'Receipt upload', intent: 'Attach a JPG or PNG receipt (max 5 MB) to an expense.', storyId: 'US-3.1', acIds: ['AC-3.1.1', 'AC-3.1.2', 'AC-3.1.3'], dependsOn: ['T-03'], agent: 'Claude Code' }),
    task(P, { id: 'T-06', title: 'Monthly report', intent: 'Totals per category for a selected month, with a chart.', storyId: 'US-4.1', acIds: ['AC-4.1.1', 'AC-4.1.2', 'AC-4.1.3', 'AC-4.1.4'], dependsOn: ['T-03'], agent: 'Codex' }),
    task(P, { id: 'T-07', title: 'Currency setting', intent: 'Let users pick a currency and use it for all totals.', storyId: 'US-4.1', acIds: ['AC-4.1.5'], dependsOn: ['T-06'] }),
  ],
  prs: [
    pr(P, { number: 1, title: 'T-01 Sign-up and sign-in', taskIds: ['T-01'], state: 'merged', openedAt: at(10, 7, 9), mergedAt: at(10, 8, 15), ci: 'passing', testPlan: [ticked('AC-1.1.1', 'e2e', 'signup.spec.ts'), ticked('AC-1.1.2', 'unit', 'auth.test.ts'), unticked('AC-1.1.4')] }),
    pr(P, { number: 2, title: 'T-02 Protect signed-in pages', taskIds: ['T-02'], state: 'merged', openedAt: at(10, 8, 16), mergedAt: at(10, 9, 11), ci: 'passing', testPlan: [ticked('AC-1.1.3', 'e2e', 'redirect.spec.ts')] }),
    pr(P, { number: 3, title: 'T-03 Expense list, add, edit and delete', taskIds: ['T-03'], state: 'merged', openedAt: at(10, 9, 10), mergedAt: at(10, 11, 14), ci: 'passing', testPlan: [ticked('AC-2.1.1', 'e2e', 'expenses.spec.ts'), ticked('AC-2.1.3', 'unit', 'expenses.test.ts'), unticked('AC-2.1.4'), unticked('AC-2.1.5')] }),
    pr(P, { number: 4, title: 'T-05 Receipt upload', taskIds: ['T-05'], state: 'open', openedAt: at(10, 12, 10), ci: 'pending' }),
    pr(P, { number: 5, title: 'T-06 Monthly report', taskIds: ['T-06'], state: 'open', openedAt: at(10, 13, 15), ci: 'passing', testPlan: [ticked('AC-4.1.1', 'unit', 'report.test.ts'), unticked('AC-4.1.4')], scopeChangeNotes: ['Scope change: add CSV export of expenses, so users can send them to their accountant (needs approval)'] }),
  ],
  humanTests: [
    { acId: 'AC-1.1.4', result: 'pass', environment: 'staging.expenses.example', tester: 'Tom Becker', testedAt: at(10, 9, 14), notes: 'Checked on an iPhone 15 and a Pixel 8' },
  ],
  scrs: [
    {
      id: 'SCR-1', projectId: P, title: 'Add CSV export of expenses', source: 'agent_pr', prNumber: 5, status: 'pending', raisedAt: at(10, 13, 16),
      rationale: 'Users want to send their expenses to an accountant.',
      proposal: {
        addStories: [
          {
            featureId: 'F5',
            featureTitle: 'Export',
            story: story('US-5.1', 'As a user, I want to export my expenses, so I can send them to my accountant.', [
              ac('AC-5.1.1', 'Exporting a month downloads a CSV with date, amount, category and note'),
              ac('AC-5.1.2', 'The CSV opens in Excel and Google Sheets with the right columns'),
              ac('AC-5.1.3', 'A month with no expenses exports only the header row'),
            ]),
          },
        ],
        addAcs: [],
        changeAcs: [],
        removeAcIds: [],
        tasks: [
          { id: 'T-08', title: 'CSV export', intent: 'Export the selected month’s expenses as a CSV file.', storyId: 'US-5.1', acIds: ['AC-5.1.1', 'AC-5.1.2', 'AC-5.1.3'], dependsOn: ['T-06'] },
        ],
      },
    },
  ],
  warnings: [
    { id: 'WRN-2', projectId: P, type: 'stalled_task', severity: 'medium', message: 'T-05 Receipt upload: no PR activity for over 24 h', suggestedAction: 'Re-prompt the agent, split the task, or check whether it is blocked', raisedAt: at(10, 15, 15), links: { taskId: 'T-05', prNumber: 4 } },
    { id: 'WRN-3', projectId: P, type: 'pr_format', severity: 'low', message: 'PR #4 has no Test plan section', suggestedAction: 'Ask the agent to update the PR description', raisedAt: at(10, 12, 11), links: { prNumber: 4 } },
  ],
}
