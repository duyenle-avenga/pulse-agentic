# New project wizard (Intelligent Flow v2) and burn-up removal

**Date:** 2026-10-16
**Status:** Approved design, ready for an implementation plan
**Builds on:** `2026-10-16-poc-foundation-design.md` (branch `feat/poc-foundation`)
**Source:** README §3.1 (greenfield flow), §3.2 (task format), §5 (New project wizard); `docs/demo/intelligent-flow-scope.md` (features, stories, ACs and tasks only)

## 1. Goal

Add the **New project wizard** from README §5 as a click-through demo, and remove the burn-up chart.

- The wizard always produces one prefilled project, **Intelligent Flow v2**. The demo presenter types nothing; they click Submit, Approve and Lock.
- All wizard content (brief, clarifying questions, generated scope, generated tasks) is **JSON in the repo**, shaped as if it came from the planner LLM.
- **localStorage stores decisions only** (story approvals and the v1 lock), never content. Clearing it resets the demo. A DB replaces it later behind the same interface.
- Once v1 is locked, Intelligent Flow v2 appears on the **Portfolio** next to A, B and C, and its **Overview** works.
- The existing project C (Intelligent Flow) is unchanged.

Out of scope for this round: the "soon" screens (next round), editing the generated scope, real LLM calls, authentication.

## 2. Wizard flow (`/projects/new`)

Entry point: a **New project** button in the Portfolio header.

A stepper with four steps:

1. **Describe.** A form prefilled from `brief.json` (name, goal, users, constraints, tech preferences, non-goals). Fields are read-only with a note "Prefilled for the demo". **Submit to planner** shows "Planner is drafting…" for about 1 second, then moves on.
2. **Clarifying questions.** From `questions.json`; each question shows its options with the prefilled answer selected (read-only). **Submit answers** shows the drafting state again, then moves on.
3. **Review generated scope.** From `scope.json`: features → stories → ACs, with 👤 on human-test ACs.
   - Each story card has **Approve** and **Reject**. Its current decision is shown on the card and can be changed until v1 is locked.
   - **Approve all** at the top approves every undecided story.
   - A counter: "N of 7 stories decided".
   - **Lock v1** is enabled only when every story is decided **and** at least one is approved. Otherwise a short hint says why it's disabled.
   - Rejected stories and their ACs are excluded from v1.
4. **v1 locked.**
   - Header: "Scope v1 · locked 16 Oct by Demo approver".
   - **Generated tasks** from `tasks.json`, each rendered as the short ticket from README §3.2 (title line with story and dependencies, one line of intent, the AC checklist with 👤 marks, the PR instruction) with a **Copy as Markdown** button.
   - A task keeps only the ACs of approved stories; a task left with no ACs is not shown. Dependencies on hidden tasks are dropped from the ticket.
   - Buttons: **Open project overview**, **Back to portfolio**.
   - A **Reset demo** link clears Intelligent Flow v2's decisions and returns to step 1.

Rules:
- Steps 1–2 are not persisted. Decisions from step 3 on are.
- Opening `/projects/new` when v1 is already locked shows step 4.
- The lock time is the demo clock (`DEMO_NOW`), and the approver is `approver` from `brief.json` ("Demo approver"), so ages stay consistent with the other projects.

## 3. Data

### 3.1 JSON content (read-only)

Folder: `src/lib/mock/planner/intelligent-flow-v2/`

| File | Contents |
|---|---|
| `brief.json` | `projectId` (`intelligent-flow-v2`), `name` (`Intelligent Flow v2`), `goal`, `users`, `constraints`, `tech`, `nonGoals`, `approver` (`Demo approver`), `repoUrl` (the Intelligent Flow repo), `board` (`jira`), `boardKey` (`CTOACT`) |
| `questions.json` | 4 questions: `id`, `question`, `options[]`, `answer` (one of the options) |
| `scope.json` | `features[]` → `stories[]` → `acs[]` (`id`, `text`, `humanTest`), using the existing domain shapes |
| `tasks.json` | `tasks[]`: `id`, `title`, `intent`, `storyId`, `acIds[]`, `dependsOn[]` |

Content rules:
- `scope.json` and `tasks.json` copy the scope doc's "Features, stories and acceptance criteria" and "Suggested technical tasks" (7 features, 7 stories, 28 ACs with 3 👤, 17 tasks). Same IDs as project C.
- `brief.json` uses the doc's one-line description of what Intelligent Flow is.
- Nothing from the scope doc's "Review notes" section. The product UI is a "dashboard", never a "console".
- Questions (prefilled answer in bold):
  1. Which channels should start a work item at launch? Jira only / **Jira and Slack** / Slack only
  2. Who may approve a gate? Anyone on the project / **A named person in the configured role** / Any lead
  3. How long must evidence be kept? 1 year / **Locked retention, set per client** / Until the project ends
  4. Which code host should the first deploy connector support? **GitHub** / GitLab / Both

A typed loader (`src/lib/mock/planner/index.ts`) imports the JSON and exports a `PlannerDraft`:

```ts
interface PlannerDraft {
  brief: PlannerBrief
  questions: PlannerQuestion[]
  scope: { features: Feature[] }
  tasks: Omit<Task, 'projectId'>[]
}
```

The repository gains `getPlannerDraft(projectId): Promise<PlannerDraft | null>` (null for any id other than `intelligent-flow-v2`).

### 3.2 Decisions (localStorage)

One versioned key: `pulse-agentic:decisions:v1`.

```json
{
  "intelligent-flow-v2": {
    "stories": { "US-1.1": "approved", "US-4.1": "rejected" },
    "lock": { "lockedAt": "2026-10-16T09:00:00+02:00", "lockedBy": "Demo approver" }
  }
}
```

Access only through a `DecisionStore` interface (`src/lib/decisions/store.ts`):

```ts
type StoryDecision = 'approved' | 'rejected'
interface ProjectDecisions {
  stories: Record<string, StoryDecision>
  lock: { lockedAt: IsoDateTime; lockedBy: string } | null
}
interface DecisionStore {
  get(projectId: string): ProjectDecisions          // empty decisions if none
  decideStory(projectId: string, storyId: string, decision: StoryDecision): void
  decideAll(projectId: string, storyIds: string[], decision: StoryDecision): void  // only undecided stories
  lock(projectId: string, lockedAt: IsoDateTime, lockedBy: string): void
  reset(projectId: string): void
  subscribe(listener: () => void): () => void
}
```

- `local-storage-store.ts` implements it. Every read and write is wrapped in try/catch. Corrupt JSON or blocked storage behaves as empty decisions and keeps working in memory for the session.
- Decisions can't change after `lock` (decideStory/decideAll are ignored for a locked project) until `reset`.
- `useDecisions(projectId)` (client hook) uses `useSyncExternalStore` with a server snapshot of empty decisions, so server and first client render match.
- The next round's screens (scope change approvals, human test results) add their decisions to the same store.

### 3.3 Combining content and decisions

`applyDecisions(draft, decisions): ProjectData | null` (`src/lib/progress/applyDecisions.ts`, pure):
- Returns `null` until v1 is locked.
- Otherwise returns a normal `ProjectData`:
  - `project`: from the brief, `kind: 'greenfield'`, `hasCi: true`, one scope version `v1` (`lockedAt`/`approvedBy` from the lock) containing only approved stories (features with no approved story are dropped).
  - `tasks`: trimmed to ACs in v1; tasks with no ACs left are dropped; `dependsOn` filtered to remaining tasks.
  - `prs`, `humanTests`, `scrs`, `signals`: empty.
- `deriveAcStates` and `rollup` then work unchanged (every AC is `not_started`).

## 4. Portfolio and Overview integration

**View-model helpers.** Move the mapping from `ProjectData` to `PortfolioRow`, `ProjectHeaderData` and `ProjectOverview` out of `mock-repository.ts` into pure functions in `src/lib/data/view-models.ts` (`toPortfolioRow`, `toProjectHeader`, `toProjectOverview`). The mock repository and the client both use them. Existing repository tests stay green.

**Portfolio (`/`).**
- The server page also loads the draft and passes the server rows plus the draft to a client `PortfolioView`.
- `PortfolioView` reads decisions; when Intelligent Flow v2 is locked it appends its row (built with `applyDecisions` + `toPortfolioRow`) and includes it in the totals strip.
- The row appears right after hydration (server render shows the 3 server projects).
- **Totals strip, reordered:** three cards in this order: **Pending approvals**, **Pending user testing**, **Open signals** (with its "N high" detail). The **Projects** card is removed.
- **Project count:** a small grey line (`text-sm text-muted-foreground`) directly above the projects table, e.g. "3 projects" ("1 project" when singular). It includes Intelligent Flow v2 once locked.

**Project pages (`/projects/[projectId]`).**
- Layout and page: if the repository has no project for the id but has a planner draft, render client components instead of `notFound()`:
  - `DraftProjectLayout`: the same `ProjectHeader` + `ProjectSidebar`, built from `applyDecisions` + `toProjectHeader`.
  - `DraftOverview`: the same `KpiCards`, `AcStateBar`, `SignalsList`, `ActivityFeed` from `toProjectOverview`.
- If v1 isn't locked, both show "Intelligent Flow v2's scope isn't locked yet" with a link to the wizard.
- Any other unknown id still returns the 404 page.

## 5. Burn-up removal

- Remove the burn-up card from the Overview, `burnup-chart.tsx`, `src/lib/progress/burnup.ts` and its tests, and the `burnup` field from `ProjectOverview`.
- Remove the shadcn `chart` component and the `recharts` dependency (nothing else uses them).
- Remove the burn-up assertion from the e2e test and the burn-up tests from the project B story test.
- Keep each AC's `history` (used for "oldest waiting for a tester").
- Update README §5 ("Project overview" row) and the foundation spec §4.3/§6.2 to drop the burn-up.

## 6. Testing

**Vitest:**
- `applyDecisions`: null until locked; only approved stories; empty features dropped; tasks trimmed and dropped; `dependsOn` filtered; all ACs `not_started` via `deriveAcStates`.
- Ticket Markdown (`src/lib/wizard/ticket-markdown.ts`): matches the README §3.2 format for a task with a 👤 AC and a dependency.
- `LocalStorageDecisionStore`: decide, decideAll only touches undecided stories, lock freezes decisions, reset, subscribe notifies, corrupt JSON and throwing storage behave as empty.
- Planner JSON integrity: unique ids, every task AC and story exists in the scope, 7/7/28/3👤/17 counts, no "console", none of a list of review-note terms.
- View-model helpers (moved code keeps its tests).
- Portfolio totals: the three cards appear in the new order, there is no "Projects" card, and the project count line reads "3 projects" / "1 project".
- Components: questions step shows prefilled answers; review step enables Lock only after all stories are decided with at least one approved; a rejected story's ACs are absent from step 4's tasks.

**Playwright (one new spec):** Portfolio shows "3 projects" → New project → Submit to planner → Submit answers → Approve all → Lock v1 → step 4 lists 17 tasks → Back to portfolio shows "4 projects" with Intelligent Flow v2 at Completion 0% · Delivery 0% → open its Overview (KPIs and "Scope v1 locked by Demo approver" in activity) → back to the wizard → Reset demo → Portfolio shows 3 projects. Each test starts with empty localStorage.

**Definition of done:** lint, typecheck, unit tests, build and e2e pass; the wizard, Portfolio and Intelligent Flow v2 Overview checked in the browser in light and dark mode.
