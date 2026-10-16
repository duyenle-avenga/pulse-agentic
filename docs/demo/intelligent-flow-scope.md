# Demo project C: Intelligent Flow, suggested scope v1 (draft)

This is the scope that Pulse's planner would propose for Intelligent Flow during brownfield onboarding. It's a **draft for review**: the team approves, edits or rejects it before it's locked as Scope v1. The POC uses it as mock data.

**What Intelligent Flow is (one line):** Work items move through an AI‑assisted SDLC (Claude Code agents), stopping at governance gates where a named person must decide. Every decision is recorded, so an **Evidence Pack** can be produced for audit.

**Sources Pulse read** (via the [repo](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow) and the CTOACT Jira project):

| Signal | Value (Oct 2026) |
|---|---|
| Stack | NestJS API + flow service (DBOS), Postgres, dashboard in plain HTML/JS (`apps/flow-service/ui`; documented React app not merged, see review notes), GCP / Terraform |
| Board | Jira `CTOACT` is shared by several CTO‑office initiatives. Intelligent Flow = 16 `[IF]` epics + their children: **403 issues** (161 stories, 209 technical tasks), 220 `New` |
| Board hygiene | No sprints (Kanban‑style); 245 of 403 unassigned; 2 of 161 stories have acceptance criteria |
| PRs | 284 merged, 16 open; 145 merged PRs (51%) carry no CTOACT key |
| Design docs | 85 ADRs, ~157 spec issues, 42 OpenSpec specs |
| Tests | ~400 test files (~100 e2e) |

**Gap report summary:**
- Scope lives in many places (epics, ADRs, specs, OpenSpec), but there is **no single approved list of features with acceptance criteria**. That makes "how close are we to done?" hard to answer.
- The `[IF]` tickets are generated in bulk from the repo's plan CSVs (266 of 403 created in bursts of 10+ per minute). They describe *what to build* and trace to ADRs, but almost none say *how to know it works*.
- PR descriptions link to Jira tickets but have **no test plan section**, so there's no link from tests to user‑facing criteria. The repo has plenty of tests, but they don't map to ACs.
- The README states that intake and the flow are **not connected yet** ("the two halves do not meet").

### Review notes (internal, checked 2026‑10‑16)

Every point below is backed by a file or PR in the repo, or by the CTOACT Jira data.

**1. No architecture diagram, only a component inventory.**
- [`system-design.svg`](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/blob/main/docs/architecture/system-design.svg) is a set of nested boxes with **no arrows by design**. Their [README](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/blob/main/docs/architecture/README.md) says it only answers "what is part of what".
- No diagram shows how components talk to each other, what calls what, where data is stored, or how it's deployed.
- The only diagram with arrows (`prototype-flows.drawio`) is a process flow of the prototype, not system architecture.
- The architecture exists only as prose spread across 85 ADRs, ~157 spec issues and the design docs. That's hard to review, and nobody can see the whole system in one place.

**2. The documented React dashboard doesn't exist on `main`.**
- [`mvp-stack.md`](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/blob/main/docs/architecture/mvp-stack.md) specifies a React + Vite + MUI dashboard in `apps/console/`. That folder doesn't exist on `main`.
- What runs today is [`apps/flow-service/ui`](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/tree/main/apps/flow-service/ui): one `index.html`, a single ~1,780‑line `app.js` (110 KB) and a 45 KB `styles.css`, with no framework and no frontend tests. Their own plan ([docs/poc/11](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/blob/main/docs/poc/11-put-the-console-on-the-react-template.md)) says it "looks like a prototype".
- The React app is only an open, unmerged PR: [#306](https://github.com/Avenga-Engineering-Acceleration/intelligent-flow/pull/306), opened 14 Oct 2026, ~8k lines added, sign‑in pages only.
- The branded React template it should be built on lives on one person's laptop (a local Windows path in docs/poc/11), not in any repo.

**3. Documentation outweighs working product.**
- 85 ADRs, ~157 spec issues and 42 OpenSpec specs, but the end‑to‑end loop (intake → flow) is still not connected according to their own README.
- Decisions churn: for example, the UI library choice was withdrawn and replaced (Radix → MUI 5) in `mvp-stack.md`.

**4. The Jira board mirrors the plan; it doesn't define "done".** *(checked against Jira on 2026‑10‑16)*
- **Tickets are well linked:** 270 of 403 `[IF]` tickets trace to an ADR or spec (`Traces to:`) and 258 list dependencies. Only 1 has an empty description.
- **No acceptance criteria:** **2 of 161 stories** have ACs (in the AC field or the description). Nothing says when a story is done.
- **Bulk‑created and unowned:** 266 tickets were created by script in bursts, and 245 of 403 have no assignee. 220 are `New`, 137 of them have never changed status, and the median age of open items is 14 days.
- **Board and code mostly in sync:** only 2 tickets that a merged PR `Resolves` are still `New` (CTOACT‑558, CTOACT‑560), and 3 more are named in a merged PR title but still `New`/`Open` (CTOACT‑192, ‑368, ‑386). Their task‑line CI check works.
- **Half the code has no ticket:** 145 of 284 merged PRs (51%) carry no CTOACT key. Pulse would flag them as unplanned work until they are linked to a task.
- **No sprints:** the project doesn't use sprints, so the `stg_jira_issue_sprints` rows for CTOACT in the Pulse DB are an ETL bug (see the README TODO).

**5. Tests exist but don't prove features.**
- There are ~400 test files (~100 e2e), but none map to user‑facing acceptance criteria.
- PR descriptions have no test plan, so nobody can tell which features are verified.

---

## Features, stories and acceptance criteria

👤 = needs human testing

### F1 · Work item intake
**US-1.1** As a client team member, I want to start a work item from Jira or Slack, so I don't need a new tool.
- AC-1.1.1 A Jira comment that mentions the flow on a configured project creates one work item linked to the issue
- AC-1.1.2 A Slack mention in a configured channel creates one work item and replies with its link
- AC-1.1.3 The same comment or mention delivered twice creates only one work item
- AC-1.1.4 A request from an unconfigured project or channel is refused and logged

### F2 · Flow and agent stages
**US-2.1** As a delivery lead, I want each work item to go through defined stages (spec → plan → implement → review → deploy), so AI work follows our SDLC.
- AC-2.1.1 A new work item starts at the first stage of its configured flow
- AC-2.1.2 An agent stage launches a Claude Code run with the pinned context bundle and records its start and end
- AC-2.1.3 The agent's claim of what it produced is checked (artifact hash) before the work item moves on
- AC-2.1.4 After a service restart, in‑flight work items resume from their last recorded state

### F3 · Governance gates and approvals
**US-3.1** As an approver, I want to approve or send back a stage's output, so nothing moves forward without a named person deciding.
- AC-3.1.1 A gate stops the flow and creates a pending approval for the configured role
- AC-3.1.2 Approve moves the work item to the next stage; send back returns it to the previous stage with a reason
- AC-3.1.3 The person who triggered or produced the work can't approve their own gate
- AC-3.1.4 An approval that passes its SLA is flagged as overdue and the approver is notified
- AC-3.1.5 👤 An approver can understand what they're approving from the gate screen alone, without opening the repo

### F4 · Escalations
**US-4.1** As an agent, I want to ask a person a question mid‑run, so I don't have to guess.
- AC-4.1.1 An agent question creates an escalation visible to the assigned person
- AC-4.1.2 The answer is passed back to the agent run and recorded
- AC-4.1.3 Repeated questions that don't move the work forward are capped and escalated to the lead

### F5 · Evidence Pack
**US-5.1** As an auditor, I want an Evidence Pack per work item, so I can see who decided what, when, and on what basis.
- AC-5.1.1 Every stage start, end, gate decision and escalation is written to an append‑only event log
- AC-5.1.2 The Evidence Pack lists each decision with its actor, timestamp, the artifact it was made against, and that artifact's hash
- AC-5.1.3 Altering a recorded event is detectable (integrity chain or anchor check fails)
- AC-5.1.4 Evidence is stored in write‑once storage with locked retention
- AC-5.1.5 👤 The exported Evidence Pack is readable by a non‑engineer auditor

### F6 · Management dashboard
**US-6.1** As an approver or lead, I want one dashboard to see work items, pending approvals and evidence.
- AC-6.1.1 Only signed‑in internal accounts can access the dashboard
- AC-6.1.2 The dashboard lists pending approvals for the signed‑in user, oldest first
- AC-6.1.3 A work item page shows its timeline of stages, decisions and escalations
- AC-6.1.4 👤 The dashboard is usable on a laptop screen without horizontal scrolling

### F7 · Deploy and connectors
**US-7.1** As a delivery lead, I want approved changes merged and deployed to the client's environment, with the result recorded.
- AC-7.1.1 After final approval, the PR is merged and the deploy stage runs
- AC-7.1.2 The deploy result (pass or fail, SHA) is recorded as evidence; a failed deploy opens an escalation
- AC-7.1.3 The GitHub connector passes the shared connector testkit

---

## Suggested technical tasks

Each task stays short: intent plus the ACs it must tick in the PR test plan. Task keys would map to existing CTOACT tickets where they exist.

| Task | Intent | ACs | Depends on |
|---|---|---|---|
| T-01 | Connect Jira intake to work item creation (with dedupe) | AC-1.1.1, AC-1.1.3, AC-1.1.4 | n/a |
| T-02 | Connect Slack intake to work item creation and reply | AC-1.1.2 | T-01 |
| T-03 | Start the configured flow when a work item is created | AC-2.1.1 | T-01 |
| T-04 | Launch the Claude Code agent stage with the pinned context bundle | AC-2.1.2 | T-03 |
| T-05 | Verify the agent's artifact hash before advancing | AC-2.1.3 | T-04 |
| T-06 | Resume in‑flight work items after a restart | AC-2.1.4 | T-03 |
| T-07 | Gate: pending approval, approve and send back | AC-3.1.1, AC-3.1.2 | T-03 |
| T-08 | Enforce the no‑self‑approval rule | AC-3.1.3 | T-07 |
| T-09 | Approval SLA: overdue flag and notification | AC-3.1.4 | T-07 |
| T-10 | Agent escalations: ask, answer, loop cap | AC-4.1.1, AC-4.1.2, AC-4.1.3 | T-04 |
| T-11 | Append‑only event log for all stage, gate and escalation events | AC-5.1.1 | T-03 |
| T-12 | Evidence Pack assembly and export | AC-5.1.2, AC-5.1.5 👤 | T-11 |
| T-13 | Tamper detection and write‑once evidence storage | AC-5.1.3, AC-5.1.4 | T-11 |
| T-14 | Dashboard: sign‑in, pending approvals list, gate screen | AC-6.1.1, AC-6.1.2, AC-3.1.5 👤 | T-07 |
| T-15 | Dashboard: work item timeline | AC-6.1.3, AC-6.1.4 👤 | T-11 |
| T-16 | Merge and deploy stage with recorded result | AC-7.1.1, AC-7.1.2 | T-07 |
| T-17 | Run the connector testkit for the GitHub connector in CI | AC-7.1.3 | n/a |

**Example ticket, as Pulse would generate it:**

```markdown
T-08 · No self-approval                     Story: US-3.1 · Depends on: T-07

Block a person from approving a gate on work they triggered or produced.

Acceptance criteria
- [ ] AC-3.1.3 The person who triggered or produced the work can't approve their own gate

PR: put `T-08` (and the CTOACT key) in the title; sections Summary, Migration,
Test plan, Notes. Tick each AC you tested and say how.
```
