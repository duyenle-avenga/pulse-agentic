import type { ProjectData } from '@/lib/domain/types'
import { ac, at, feature, pr, story, task, ticked, unticked } from './builders'

const P = 'intelligent-flow'

export const intelligentFlow: ProjectData = {
  project: {
    id: P,
    name: 'Intelligent Flow',
    description:
      'Work items move through an AI-assisted SDLC (Claude Code agents), stopping at governance gates where a named person must decide. Every decision is recorded, so an Evidence Pack can be produced for audit.',
    kind: 'brownfield',
    board: 'jira',
    boardKey: 'CTOACT',
    repoUrl: 'https://github.com/Avenga-Engineering-Acceleration/intelligent-flow',
    hasCi: true,
    scopeVersions: [
      {
        label: 'v1',
        lockedAt: at(10, 2, 10),
        approvedBy: 'Product owner',
        features: [
          feature('F1', 'Work item intake', [
            story('US-1.1', 'As a client team member, I want to start a work item from Jira or Slack, so I don’t need a new tool.', [
              ac('AC-1.1.1', 'A Jira comment that mentions the flow on a configured project creates one work item linked to the issue'),
              ac('AC-1.1.2', 'A Slack mention in a configured channel creates one work item and replies with its link'),
              ac('AC-1.1.3', 'The same comment or mention delivered twice creates only one work item'),
              ac('AC-1.1.4', 'A request from an unconfigured project or channel is refused and logged'),
            ]),
          ]),
          feature('F2', 'Flow and agent stages', [
            story('US-2.1', 'As a delivery lead, I want each work item to go through defined stages (spec → plan → implement → review → deploy), so AI work follows our SDLC.', [
              ac('AC-2.1.1', 'A new work item starts at the first stage of its configured flow'),
              ac('AC-2.1.2', 'An agent stage launches a Claude Code run with the pinned context bundle and records its start and end'),
              ac('AC-2.1.3', 'The agent’s claim of what it produced is checked (artifact hash) before the work item moves on'),
              ac('AC-2.1.4', 'After a service restart, in-flight work items resume from their last recorded state'),
            ]),
          ]),
          feature('F3', 'Governance gates and approvals', [
            story('US-3.1', 'As an approver, I want to approve or send back a stage’s output, so nothing moves forward without a named person deciding.', [
              ac('AC-3.1.1', 'A gate stops the flow and creates a pending approval for the configured role'),
              ac('AC-3.1.2', 'Approve moves the work item to the next stage; send back returns it to the previous stage with a reason'),
              ac('AC-3.1.3', 'The person who triggered or produced the work can’t approve their own gate'),
              ac('AC-3.1.4', 'An approval that passes its SLA is flagged as overdue and the approver is notified'),
              ac('AC-3.1.5', 'An approver can understand what they’re approving from the gate screen alone, without opening the repo', true),
            ]),
          ]),
          feature('F4', 'Escalations', [
            story('US-4.1', 'As an agent, I want to ask a person a question mid-run, so I don’t have to guess.', [
              ac('AC-4.1.1', 'An agent question creates an escalation visible to the assigned person'),
              ac('AC-4.1.2', 'The answer is passed back to the agent run and recorded'),
              ac('AC-4.1.3', 'Repeated questions that don’t move the work forward are capped and escalated to the lead'),
            ]),
          ]),
          feature('F5', 'Evidence Pack', [
            story('US-5.1', 'As an auditor, I want an Evidence Pack per work item, so I can see who decided what, when, and on what basis.', [
              ac('AC-5.1.1', 'Every stage start, end, gate decision and escalation is written to an append-only event log'),
              ac('AC-5.1.2', 'The Evidence Pack lists each decision with its actor, timestamp, the artifact it was made against, and that artifact’s hash'),
              ac('AC-5.1.3', 'Altering a recorded event is detectable (integrity chain or anchor check fails)'),
              ac('AC-5.1.4', 'Evidence is stored in write-once storage with locked retention'),
              ac('AC-5.1.5', 'The exported Evidence Pack is readable by a non-engineer auditor', true),
            ]),
          ]),
          feature('F6', 'Management dashboard', [
            story('US-6.1', 'As an approver or lead, I want one dashboard to see work items, pending approvals and evidence.', [
              ac('AC-6.1.1', 'Only signed-in internal accounts can access the dashboard'),
              ac('AC-6.1.2', 'The dashboard lists pending approvals for the signed-in user, oldest first'),
              ac('AC-6.1.3', 'A work item page shows its timeline of stages, decisions and escalations'),
              ac('AC-6.1.4', 'The dashboard is usable on a laptop screen without horizontal scrolling', true),
            ]),
          ]),
          feature('F7', 'Deploy and connectors', [
            story('US-7.1', 'As a delivery lead, I want approved changes merged and deployed to the client’s environment, with the result recorded.', [
              ac('AC-7.1.1', 'After final approval, the PR is merged and the deploy stage runs'),
              ac('AC-7.1.2', 'The deploy result (pass or fail, SHA) is recorded as evidence; a failed deploy opens an escalation'),
              ac('AC-7.1.3', 'The GitHub connector passes the shared connector testkit'),
            ]),
          ]),
        ],
      },
    ],
  },
  tasks: [
    task(P, { id: 'T-01', title: 'Connect Jira intake to work item creation (with dedupe)', storyId: 'US-1.1', acIds: ['AC-1.1.1', 'AC-1.1.3', 'AC-1.1.4'], agent: 'Claude Code' }),
    task(P, { id: 'T-02', title: 'Connect Slack intake to work item creation and reply', storyId: 'US-1.1', acIds: ['AC-1.1.2'], dependsOn: ['T-01'], agent: 'Claude Code' }),
    task(P, { id: 'T-03', title: 'Start the configured flow when a work item is created', storyId: 'US-2.1', acIds: ['AC-2.1.1'], dependsOn: ['T-01'], agent: 'Claude Code' }),
    task(P, { id: 'T-04', title: 'Launch the Claude Code agent stage with the pinned context bundle', storyId: 'US-2.1', acIds: ['AC-2.1.2'], dependsOn: ['T-03'], agent: 'Claude Code' }),
    task(P, { id: 'T-05', title: 'Verify the agent’s artifact hash before advancing', storyId: 'US-2.1', acIds: ['AC-2.1.3'], dependsOn: ['T-04'], agent: 'Claude Code' }),
    task(P, { id: 'T-06', title: 'Resume in-flight work items after a restart', storyId: 'US-2.1', acIds: ['AC-2.1.4'], dependsOn: ['T-03'], agent: 'Claude Code' }),
    task(P, { id: 'T-07', title: 'Gate: pending approval, approve and send back', storyId: 'US-3.1', acIds: ['AC-3.1.1', 'AC-3.1.2'], dependsOn: ['T-03'], agent: 'Claude Code' }),
    task(P, { id: 'T-08', title: 'Enforce the no-self-approval rule', storyId: 'US-3.1', acIds: ['AC-3.1.3'], dependsOn: ['T-07'], agent: 'Claude Code' }),
    task(P, { id: 'T-09', title: 'Approval SLA: overdue flag and notification', storyId: 'US-3.1', acIds: ['AC-3.1.4'], dependsOn: ['T-07'], agent: 'Claude Code' }),
    task(P, { id: 'T-10', title: 'Agent escalations: ask, answer, loop cap', storyId: 'US-4.1', acIds: ['AC-4.1.1', 'AC-4.1.2', 'AC-4.1.3'], dependsOn: ['T-04'], agent: 'Claude Code' }),
    task(P, { id: 'T-11', title: 'Append-only event log for all stage, gate and escalation events', storyId: 'US-5.1', acIds: ['AC-5.1.1'], dependsOn: ['T-03'], agent: 'Claude Code' }),
    task(P, { id: 'T-12', title: 'Evidence Pack assembly and export', storyId: 'US-5.1', acIds: ['AC-5.1.2', 'AC-5.1.5'], dependsOn: ['T-11'], agent: 'Claude Code' }),
    task(P, { id: 'T-13', title: 'Tamper detection and write-once evidence storage', storyId: 'US-5.1', acIds: ['AC-5.1.3', 'AC-5.1.4'], dependsOn: ['T-11'], agent: 'Claude Code' }),
    task(P, { id: 'T-14', title: 'Dashboard: sign-in, pending approvals list, gate screen', storyId: 'US-6.1', acIds: ['AC-6.1.1', 'AC-6.1.2', 'AC-3.1.5'], dependsOn: ['T-07'], agent: 'Claude Code' }),
    task(P, { id: 'T-15', title: 'Dashboard: work item timeline', storyId: 'US-6.1', acIds: ['AC-6.1.3', 'AC-6.1.4'], dependsOn: ['T-11'], agent: 'Claude Code' }),
    task(P, { id: 'T-16', title: 'Merge and deploy stage with recorded result', storyId: 'US-7.1', acIds: ['AC-7.1.1', 'AC-7.1.2'], dependsOn: ['T-07'], agent: 'Claude Code' }),
    task(P, { id: 'T-17', title: 'Run the connector testkit for the GitHub connector in CI', storyId: 'US-7.1', acIds: ['AC-7.1.3'], agent: 'Claude Code' }),
  ],
  // Statuses are illustrative (README §5). PRs merged before the baseline have no Test plan section;
  // Pulse linked them to tasks during onboarding.
  prs: [
    pr(P, { number: 201, title: 'Jira intake creates work items', taskIds: ['T-01'], state: 'merged', openedAt: at(9, 4, 10), mergedAt: at(9, 8, 15), ci: 'passing' }),
    pr(P, { number: 202, title: 'Start the configured flow for new work items', taskIds: ['T-03'], state: 'merged', openedAt: at(9, 9, 9), mergedAt: at(9, 10, 16), ci: 'passing' }),
    pr(P, { number: 203, title: 'Claude Code agent stage with pinned context bundle', taskIds: ['T-04'], state: 'merged', openedAt: at(9, 11, 9), mergedAt: at(9, 15, 11), ci: 'passing' }),
    pr(P, { number: 204, title: 'Gate approvals: approve and send back', taskIds: ['T-07'], state: 'merged', openedAt: at(9, 16, 9), mergedAt: at(9, 18, 14), ci: 'passing' }),
    pr(P, { number: 205, title: 'Append-only event log', taskIds: ['T-11'], state: 'merged', openedAt: at(9, 18, 15), mergedAt: at(9, 21, 10), ci: 'passing' }),
    pr(P, { number: 206, title: 'Dashboard sign-in, approvals list and gate screen', taskIds: ['T-14'], state: 'merged', openedAt: at(9, 22, 9), mergedAt: at(9, 25, 17), ci: 'passing' }),
    pr(P, { number: 207, title: 'Resume work items after restart', taskIds: ['T-06'], state: 'merged', openedAt: at(9, 26, 9), mergedAt: at(9, 29, 12), ci: 'passing' }),
    pr(P, { number: 208, title: 'GitHub connector testkit in CI', taskIds: ['T-17'], state: 'merged', openedAt: at(9, 29, 14), mergedAt: at(9, 30, 15), ci: 'passing' }),
    pr(P, { number: 210, title: 'T-08 No self-approval', taskIds: ['T-08'], state: 'merged', openedAt: at(10, 6, 9), mergedAt: at(10, 7, 14), ci: 'passing', testPlan: [ticked('AC-3.1.3', 'unit', 'self-approval.spec.ts')] }),
    pr(P, { number: 211, title: 'T-12 Evidence Pack assembly and export', taskIds: ['T-12'], state: 'merged', openedAt: at(10, 7, 10), mergedAt: at(10, 9, 16), ci: 'passing', testPlan: [ticked('AC-5.1.2', 'integration', 'evidence-pack.spec.ts'), unticked('AC-5.1.5')] }),
    pr(P, { number: 212, title: 'T-13 Tamper detection and write-once storage', taskIds: ['T-13'], state: 'merged', openedAt: at(10, 8, 9), mergedAt: at(10, 10, 12), ci: 'passing', testPlan: [ticked('AC-5.1.3', 'unit', 'event-chain.spec.ts')] }),
    pr(P, { number: 213, title: 'T-15 Work item timeline', taskIds: ['T-15'], state: 'merged', openedAt: at(10, 10, 9), mergedAt: at(10, 13, 15), ci: 'passing', testPlan: [ticked('AC-6.1.3', 'e2e', 'timeline.e2e-spec.ts'), unticked('AC-6.1.4')] }),
    pr(P, { number: 214, title: 'T-02 Slack intake', taskIds: ['T-02'], state: 'open', openedAt: at(10, 14, 11), ci: 'pending', testPlan: [unticked('AC-1.1.2')] }),
    pr(P, { number: 215, title: 'T-09 Approval SLA and overdue flag', taskIds: ['T-09'], state: 'open', openedAt: at(10, 15, 10), ci: 'passing', testPlan: [unticked('AC-3.1.4')] }),
  ],
  humanTests: [],
  scrs: [],
  signals: [
    { id: 'SIG-1', projectId: P, type: 'unplanned_work', severity: 'medium', message: '145 merged PRs carry no CTOACT key', suggestedAction: 'Link them to a task, or raise an SCR for work outside the scope', raisedAt: at(10, 2, 11), links: {} },
    { id: 'SIG-2', projectId: P, type: 'unchecked_acs_merged', severity: 'medium', message: 'PR #212 was merged without AC-5.1.4 in its test plan', suggestedAction: 'Open a follow-up task, or confirm the AC moves to a later task', raisedAt: at(10, 10, 13), links: { prNumber: 212, acId: 'AC-5.1.4', taskId: 'T-13' } },
    { id: 'SIG-3', projectId: P, type: 'pending_user_testing', severity: 'low', message: '3 👤 ACs are waiting for a tester, the oldest since 25 Sep', suggestedAction: 'Assign a tester and start with the oldest', raisedAt: at(10, 16, 8), links: {} },
  ],
}
