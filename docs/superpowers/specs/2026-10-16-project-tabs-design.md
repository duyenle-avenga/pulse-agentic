# Project tabs: User testing, Scope, Tasks, Evidence, Approvals, Changelog, Metrics

**Date:** 2026-10-16
**Status:** Approved design, ready for an implementation plan
**Builds on:** `2026-10-16-poc-foundation-design.md`, `2026-10-16-new-project-wizard-design.md` (branch `feat/poc-foundation`)
**Source:** README §3.2–3.5 (traceability, human testing, AC states, scope changes, warnings), §5 (screens)

## 1. Goal

Replace the seven "soon" entries in the project sidebar with working screens, for every project (A, B, C and Intelligent Flow v2).

- Two screens write decisions: **User testing** (record a human test result) and **Approvals** (approve or reject a scope change request). Both use the wizard's localStorage `DecisionStore`.
- Decisions show up **everywhere**: AC states, Overview, Evidence, Scope, Changelog, the project header and the Portfolio.
- Approving an SCR **creates the next scope version** (v1 → v1.1) from the SCR's proposed change, as in README §3.4.
- The other five screens only read data.

Out of scope for this round: editing scope outside an SCR, raising new SCRs from the UI, the PR-description parser, a real Metabase embed, authentication.

## 2. Architecture

### 2.1 Routes and sidebar

New pages under `/projects/[projectId]/`: `user-testing`, `scope`, `tasks` (`?view=board` for the board), `evidence`, `approvals`, `changelog`, `metrics`.

`ProjectSidebar` becomes a client component. All eight entries (Overview plus the seven) are links; the current one gets `aria-current="page"` from `usePathname`. The "soon" label is removed. A **Reset demo decisions** button at the bottom of the sidebar clears that project's decisions (`DecisionStore.reset`). It is hidden for Intelligent Flow v2, whose decisions are reset from the wizard.

### 2.2 Loading and the project provider

**Repository.** `getProjectHeader`, `getProjectOverview` and `getPortfolio` are removed. The repository becomes:

```ts
interface PulseRepository {
  getProjectData(projectId: string): Promise<ProjectData | null>
  getAllProjectData(): Promise<ProjectData[]>
  getPlannerDraft(projectId: string): Promise<PlannerDraft | null>
}
```

The view-model helpers in `src/lib/data/view-models.ts` (`toProjectHeader`, `toPortfolioRow`, `toProjectOverview`) stay and are now only called on merged data in the client.

**Project layout.** The server layout loads `getProjectData(id)`, or the planner draft if there is none, and passes it with `now` to a client `ProjectDataProvider` (`src/components/project/project-data-provider.tsx`). Unknown ids still return the 404 page.

**Provider.**
- Reads `useDecisions(projectId)`.
- For Intelligent Flow v2 it first runs `applyDecisions(draft, decisions)`. If v1 isn't locked it shows the existing "scope isn't locked yet" message with a link to the wizard.
- Then runs `applyProjectDecisions(data, decisions, now)` and `deriveAcStates`.
- Exposes `{ data, acStates, now }` through context (`useProject()`). The header (`ProjectShell`) and every tab read it.
- The server snapshot of decisions is empty, so mock projects render fully on the server and stored decisions apply right after hydration. Only Intelligent Flow v2 waits for the client (`useIsClient`), as today.

`DraftProjectLayout` and `DraftOverview` are removed: mock projects and Intelligent Flow v2 share one path. Pages become thin: they render a client view that calls `useProject()`.

**Portfolio.** The server page passes `getAllProjectData()` and the draft to `PortfolioView`, which applies each project's decisions with the same functions and builds rows with `toPortfolioRow`.

### 2.3 Decisions

Same store, same key (`pulse-agentic:decisions:v1`), two new optional fields (absent until used, so wizard-only decisions keep their shape):

```ts
interface ScrDecision {
  status: 'approved' | 'rejected'
  decidedAt: IsoDateTime
  decidedBy: string
  reason: string
}

interface ProjectDecisions {
  stories: Record<string, StoryDecision>          // wizard, unchanged
  lock: { lockedAt: IsoDateTime; lockedBy: string } | null  // wizard, unchanged
  humanTests?: HumanTestResult[]                   // recorded in the demo, oldest first
  scrs?: Record<string, ScrDecision>               // keyed by SCR id
}
```

`DecisionStore` gains:
- `getAll()`, every project's decisions (a stable snapshot, used by the Portfolio).
- `recordHumanTest(projectId, result: HumanTestResult): void`, which appends.
- `decideScr(projectId, scrId, decision: ScrDecision): void`. It is ignored if that SCR already has a decision.

Rules:
- Saved decisions without the new fields load unchanged; readers treat a missing field as empty. Malformed entries are dropped by `normalize`, as today.
- Decision times are the demo clock (`DEMO_NOW`).
- `reset` clears all four fields for the project.

### 2.4 Applying decisions

`applyProjectDecisions(data, decisions, now): ProjectData` (`src/lib/progress/applyProjectDecisions.ts`, pure):

1. Appends `decisions.humanTests` to `data.humanTests`.
2. For each SCR with a decision, sets `status`, `decidedAt`, `decidedBy` and `decisionReason`. SCRs that are already decided in the mocks ignore stored decisions.
3. For each **approved** SCR with a `proposal` whose decision came from the store, in `decidedAt` order (then SCR id), applies the proposal to the current scope and appends a new version:
   - **Label:** the minor version goes up by one (`v1` → `v1.1`, `v1.1` → `v1.2`).
   - **`lockedAt` / `approvedBy`:** from the decision.
   - **`changedBy`:** the SCR id.
   - **Tasks:** the proposal's tasks are added with the project id.
4. Recomputes the two derived warning types (§2.6).

Mock SCRs that are already approved (B's SCR-1) don't apply their proposal again: their version is already in `scopeVersions`.

### 2.5 SCR proposal (mock data)

`ScopeChangeRequest` gains:

```ts
interface ScopeProposal {
  /** featureTitle is set only when the story goes into a new feature with id featureId. */
  addStories: { featureId: string; featureTitle?: string; story: UserStory }[]
  addAcs: { storyId: string; ac: AcceptanceCriterion }[]
  changeAcs: { acId: string; text: string }[]
  removeAcIds: string[]
  tasks: PlannedTask[]
}

interface ScopeChangeRequest {
  // existing fields …
  proposal?: ScopeProposal
  decisionReason?: string
}

interface ScopeVersion {
  // existing fields …
  /** The SCR that created this version; absent for the initial version. */
  changedBy?: string
}
```

`ScopeVersion.changedBy` is also set on B's existing `v1.1` (`SCR-1`).

**Demo data changes:**
- **A:** SCR-1 (CSV export, pending) gets a proposal: one new story with 3 ACs and 1 task.
- **B:** SCR-1 (approved) gets the proposal that matches its existing `v1 → v1.1` diff. Two new SCRs:
  - SCR-2, pending, source `pulse`: changes one AC's text and adds one AC.
  - SCR-3, rejected, source `human`, with `decidedAt`, `decidedBy` and `decisionReason`.
- **A and B:** each has at least one 👤 AC in `pending_user_testing`. Add one where it's missing.
- **C:** unchanged.

### 2.6 Warnings

Two warning types are now computed by a pure `deriveWarnings(data, acStates, now)` instead of being mock records:
- **`pending_user_testing`:** one warning when at least one 👤 AC is pending, with the count and the date the oldest started waiting (same wording as today's mock: "3 👤 ACs are waiting for a tester, the oldest since 25 Sep").
- **`pending_decision`:** one warning per pending SCR raised more than 24 h before `now` ("SCR-1 (Add CSV export of expenses) has been waiting for approval for 2 days"; suggested action names the current scope's approver).

Mock records of these two types are removed. The other types stay as mock records.

## 3. Screens

Shared: state badges use the colours in `labels.ts`; 👤 uses the wizard's marker. New shadcn primitives: `input`, `textarea`, `label`. Selects and radios are native elements (simpler to test, no popover needed).

### 3.1 User testing

- **Queue:** 👤 ACs in `pending_user_testing`, oldest first. Each row shows the AC id and text, its story, the task and the merged PR that delivered it (#, merged date), and the waiting time ("waiting 21 d").
- **Record result** opens an inline form on the row:
  - Result: pass or fail (radio), required.
  - Environment: required, prefilled with the environment of the project's most recent result (empty if none).
  - Tester: required.
  - Date: the demo date, read-only.
  - Notes: optional.
- Saving calls `recordHumanTest`. The row leaves the queue: a pass makes the AC `verified`; a fail makes it `failing`, which puts its task back to In progress (§3.3).
- **Recorded results:** a table below the queue with every result (mock and demo), newest first.
- Empty queue: "No ACs are waiting for a tester."

### 3.2 Scope

- **Version switcher:** a select listing every version, defaulting to the current one, with "Locked by … on …".
- **Tree:** features → stories → ACs. On the current version each AC shows its state badge and 👤 where it applies, and each story shows "3 of 4 verified". Older versions show the tree without states.
- **Compare with:** a second select. When set, the screen shows the diff from `diffScopes(from, to)` (`src/lib/progress/diffScopes.ts`, pure): features, stories and ACs added, changed (old text → new text) or removed, each with a coloured marker. Approvals and Changelog reuse the same diff component (`ScopeDiff`).
- Scope's compare view can be linked to with `?from=v1&to=v1.1`.

### 3.3 Tasks

Task status (`taskStatus(task, prs, acStates)`, pure), first match wins:
1. **Done:** every linked AC is `verified`.
2. **In review:** an open PR links to the task.
3. **In progress:** any linked AC is past `not_started` (including failing, regressed and pending user testing).
4. **Not started.**

- **List (default):** ID, title, story, AC progress ("2/3 verified"), status, PRs (#n with a CI dot), agent, depends on.
- **Board (`?view=board`):** four columns, one per status. Cards show ID, title, AC progress and agent.
- A toggle switches between list and board.
- Clicking a task shows its ticket with the wizard's `TaskTicket` and Copy as Markdown, plus its PRs. On the list it expands inline; on the board it opens below the board.

### 3.4 Evidence

- One row per AC in the current scope, in scope order, showing its latest evidence:
  - **PR:** PR #, ticked / unticked / failed, test type, test file, CI, short SHA, merged at.
  - **Human test:** pass or fail, environment, tester, date.
  - **None:** "No evidence yet".
- "+N earlier" expands the AC's full evidence history, newest first.
- Filter chips: All / Verified / Failing or regressed / Unverified (implemented or pending user testing) / No evidence.
- Evidence for an AC = test plan items for that AC in merged PRs, plus its human test results.

### 3.5 Approvals

- Pending SCRs first (oldest first), then decided ones (newest first).
- Each card shows the id, title, source ("Agent · PR #5", "Pulse", "Human"), raised date and age, and the rationale.
- **Impact analysis** on pending cards (from the proposal, pure `scrImpact(data, scr)`): features and stories touched, ACs added / changed / removed (`ScopeDiff`), new tasks, and completion before → after ("62% → 51%").
- **Approve** and **Reject** each need an approver name (prefilled with the current scope's approver) and a reason. Both call `decideScr`.
- Decided cards show the decision, who decided and when, and the reason. Approved ones add "created v1.1" with a link to Scope's compare view.
- No pending SCRs: "Nothing waiting for approval."

### 3.6 Changelog

An append-only list, newest first, from a pure `changelog(data)`:
- **Initial version:** "v1 locked", with approver and time (baseline for brownfield projects, the wizard for Intelligent Flow v2).
- **Approved SCR:** "v1 → v1.1", the summary from the diff ("+1 story, +3 ACs, 1 AC changed"), expandable to the full `ScopeDiff`.
- **Rejected SCR:** "SCR-3 rejected, no version change".
- Each SCR entry shows source, rationale, raised at, decided by, decided at and reason.

### 3.7 Metrics

A placeholder card: "Pulse KPI dashboards (flow time, cycle time, throughput) from Metabase appear here", with a dashed box the size of the future iframe and the note "Signed embedding is on the roadmap." No iframe.

### 3.8 Overview

Content unchanged. It now reads from the provider, so KPIs, Top warnings and Recent activity reflect demo decisions. Recent activity gains entries for new versions created by approvals (the existing `scope_locked` and `scr_decided` events cover them).

## 4. Testing

**Vitest, pure logic:**
- `applyProjectDecisions`: recorded human tests change AC states through `deriveAcStates`; approving A's SCR-1 creates `v1.1` with the decision's `lockedAt`/`approvedBy`/`changedBy`; two approvals create `v1.1` then `v1.2`; a rejected SCR leaves scope unchanged; proposal tasks are added; change and remove are applied; mock-decided SCRs ignore stored decisions and don't re-apply their proposal.
- `diffScopes`: added / changed / removed for features, stories and ACs; identical versions give an empty diff; B's `v1 → v1.1` matches SCR-1's proposal.
- `changelog`: order, initial entry, rejected entry, summary text.
- `taskStatus`: each rule and its precedence, including failing → In progress and open PR over merged ACs.
- `deriveWarnings`: `pending_user_testing` count, oldest date, gone when the queue is empty; `pending_decision` only after 24 h and gone once decided.
- `scrImpact`: completion before → after for A's SCR-1.
- Decision store: `recordHumanTest` appends; `decideScr` works once; old saved decisions load with empty new fields; corrupt or throwing storage behaves as empty.
- Mock integrity: proposals reference existing features and ACs; new ids are unique; A and B each have a 👤 AC pending user testing; B has one pending, one approved and one rejected SCR; C's counts are unchanged and it has no SCRs; the existing "console" and review-note checks still pass.
- View models: existing tests stay green on the new path.

**Vitest, components:**
- Sidebar: eight links, `aria-current` on the current one, no "soon".
- User testing: environment and tester are required; saving removes the row and adds it to Recorded results.
- Approvals: name and reason required; a decided card shows the decision and the version it created.
- Scope: switching versions changes the tree; Compare shows the diff.
- Tasks: list/board toggle; the ticket opens with Copy as Markdown.
- Evidence: filter chips narrow the rows; "No evidence yet" shows for ACs without evidence.

**Playwright (one new spec, each test starts with empty localStorage):**
1. A: approve SCR-1 with a reason → header shows v1.1 and 0 pending approvals; Scope compare v1 → v1.1 lists the 3 new ACs; Changelog shows "v1 → v1.1"; Overview completion went down; Portfolio shows A at v1.1.
2. C: record a pass for the oldest 👤 AC → queue goes from 3 to 2; Top warnings says 2; Evidence shows the human result; Portfolio pending user testing drops by one.
3. B: reject SCR-2 → scope stays at v1.1; Changelog shows the rejection.
4. A: Reset demo decisions → back to v1 with SCR-1 pending.
5. Every tab of every project loads with its heading, including Intelligent Flow v2 after locking it in the wizard.

**Docs:** update ARCHITECTURE.md (provider data flow, routes, repository methods) and README §5 if a screen description changes.

**Definition of done:** lint, typecheck, unit tests, build and e2e pass; every tab checked in the browser for A, B, C and Intelligent Flow v2, in light and dark mode, including the three demo flows.
