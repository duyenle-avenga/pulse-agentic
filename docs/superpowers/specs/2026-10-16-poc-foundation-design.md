# POC foundation: setup, mock data layer, Portfolio and Project overview

**Date:** 2026-10-16
**Status:** Approved design, ready for an implementation plan
**Update 2026-10-16:** the burn-up (§4.3, §6.2) was removed; see 2026-10-16-new-project-wizard-design.md §5.
**Source:** README §5 (POC scope), §3.2–3.3 (evidence model), `docs/demo/intelligent-flow-scope.md` (Project C)

## 1. Goal

Stand up the Pulse Agentic POC and build its first two screens on top of a mock data layer that can be swapped for a real DB later:

- Next.js project setup, tooling and tests
- Domain model, mock data for demo projects A, B and C, and a repository interface
- Pure functions that derive AC states, progress rollups and the burn‑up from raw evidence
- **Portfolio** screen (`/`)
- **Project overview** screen (`/projects/[projectId]`)
- `ARCHITECTURE.md` at the repo root documenting the folder structure and data flow

Out of scope for this round: the other README §5 screens, the PR‑description parser, the signals rules engine, any write flows, API routes.

## 2. Project setup and structure

### Stack

- Next.js (latest), App Router, TypeScript strict, `src/` directory, import alias `@/*` → `src/*`
- Tailwind CSS v4, shadcn/ui (neutral theme), Recharts via the shadcn `chart` component
- ESLint (Next config)
- Vitest + Testing Library (jsdom) for unit and component tests
- Playwright (Chromium only) for smoke tests
- npm; Node 24

Scaffolding: `create-next-app` refuses a non‑empty folder, so generate the app in a temporary directory and copy it into the repo root. Keep the existing `README.md`, `CLAUDE.md`, `docs/` and `.gitignore` (merge Next's ignore entries into it). The app reads no env vars; `.env` and `.env*.local` stay ignored and are never printed or committed.

npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`.

### Folder structure

```
src/
  app/
    layout.tsx                  top bar: "Pulse Agentic" + "as of 16 Oct 2026, 09:00" (demo clock)
    page.tsx                    Portfolio
    projects/[projectId]/
      layout.tsx                project header + sidebar
      page.tsx                  Overview
      (404 handled by src/app/not-found.tsx)
  components/
    ui/                         shadcn components (card, badge, table, chart, progress, separator, tooltip)
    portfolio/                  PortfolioTotals, ProjectsTable
    project/                    ProjectHeader, ProjectSidebar, KpiCards, AcStateBar, BurnupChart,
                                SignalsList, ActivityFeed
  lib/
    domain/types.ts             domain types (section 3)
    progress/
      deriveAcStates.ts         AC state + history from raw evidence
      rollup.ts                 completion %, delivery %, counts
      burnup.ts                 daily burn-up series
      activity.ts               recent activity feed
    data/
      repository.ts             PulseRepository interface + view-model types
      mock-repository.ts        implementation over lib/mock
      index.ts                  getRepository()
    mock/
      clock.ts                  DEMO_NOW = 2026-10-16T09:00:00+02:00
      project-a.ts, project-b.ts, project-c.ts
      index.ts
e2e/
  portfolio.spec.ts
  overview.spec.ts
ARCHITECTURE.md
```

`ARCHITECTURE.md` (new, root) documents this tree, what each folder owns, the data flow below and the "no API routes yet" rule. CLAUDE.md gets a one‑line pointer to it.

### Data access (approach A)

Pages are async Server Components. They call `getRepository()` and pass plain, serialisable props to components. There are **no API routes** in this round. Repository methods are `async` even though the mock is in memory, so a Postgres implementation can replace it without touching the UI. Only chart components are client components. Later write flows (user testing, approvals) will use Server Actions over the same repository.

```
page.tsx (Server Component) → getRepository() → MockRepository → lib/mock + lib/progress → props → components
```

### Demo clock

All mock timestamps and all relative ages ("3 h ago", "waiting 2 days") use a fixed `DEMO_NOW` of 2026‑10‑16 09:00 (Europe/Berlin, UTC+2). The burn‑up ends at `DEMO_NOW`. Nothing reads the real clock, so the demo and tests are stable.

## 3. Domain model

The mocks store **raw facts only**. AC states, percentages, the burn‑up and the activity feed are derived.

| Type | Fields |
|---|---|
| `Project` | `id`, `name`, `description`, `kind: 'greenfield' \| 'brownfield'`, `board: 'none' \| 'github' \| 'jira'`, `repoUrl?`, `boardKey?` (e.g. `CTOACT`), `hasCi: boolean`, `scopeVersions: ScopeVersion[]` (ordered; last one is current) |
| `ScopeVersion` | `label` (`v1`, `v1.1`), `lockedAt`, `approvedBy`, `features: Feature[]` |
| `Feature` | `id` (`F1`), `title`, `stories: UserStory[]` |
| `UserStory` | `id` (`US-1.1`), `text`, `acs: AcceptanceCriterion[]` |
| `AcceptanceCriterion` | `id` (`AC-1.1.1`), `text`, `humanTest: boolean` (👤) |
| `Task` | `id` (`T-08`), `projectId`, `title`, `intent`, `storyId`, `acIds: string[]`, `dependsOn: string[]`, `agent?`, `externalKey?` (e.g. `CTOACT-558`) |
| `PullRequest` | `number`, `projectId`, `title`, `taskIds: string[]` (already parsed), `state: 'open' \| 'merged' \| 'closed'`, `openedAt`, `mergedAt?`, `headSha`, `ci: 'passing' \| 'failing' \| 'pending' \| 'none'`, `sections: { summary, migration, testPlan, notes }` (present or not), `testPlan: TestPlanItem[]`, `scopeChangeNotes: string[]` |
| `TestPlanItem` | `acId?` (absent = unplanned item), `text`, `mark: 'ticked' \| 'unticked' \| 'failed'`, `testType?: 'unit' \| 'integration' \| 'e2e' \| 'manual'`, `testFile?` |
| `HumanTestResult` | `acId`, `result: 'pass' \| 'fail'`, `environment`, `tester`, `testedAt`, `notes?` |
| `ScopeChangeRequest` | `id`, `projectId`, `title`, `source: 'agent_pr' \| 'human' \| 'pulse'`, `prNumber?`, `status: 'pending' \| 'approved' \| 'rejected'`, `raisedAt`, `decidedAt?`, `decidedBy?`, `rationale?` |
| `Signal` | `id`, `projectId`, `type` (one of the README §3.5 types), `severity: 'high' \| 'medium' \| 'low'`, `message`, `suggestedAction`, `raisedAt`, `links: { taskId?, prNumber?, acId? }` |

PRs are stored **already parsed**. The PR‑description parser belongs to the Traceability engine and is a later round. Signals are **mock records** for now; the rules engine replaces them later behind the same repository method.

`AcState = 'not_started' | 'in_progress' | 'implemented' | 'verified' | 'failing' | 'regressed' | 'pending_user_testing'`

## 4. Derivation rules

### 4.1 `deriveAcStates(project, tasks, prs, humanTests)`

Returns, for each AC in the **current** scope version, its current `state` and a `history: { state, at }[]` of transitions. Pure function.

1. **Touches:** a PR touches an AC if any of its `taskIds` refers to a task whose `acIds` include the AC, or if its `testPlan` has an item with that `acId`.
2. **Regular AC:** walk merged PRs that touch it, in `mergedAt` order. For each PR, look at the AC's test plan item:
   - `ticked` and CI `passing` or `none` → `verified`
   - `ticked` and CI `failing`, or mark `failed` → `failing`; if the AC was `verified` before, `regressed`
   - `unticked`, or not in the test plan → `implemented`, but never moves a `verified` (or `failing`/`regressed`) AC down to `implemented`
   - CI `pending` on a merged PR with a ticked item → `implemented` (not proven yet)
3. **👤 AC:** the first merged PR that touches it → `pending_user_testing`. Each `HumanTestResult` for it, in `testedAt` order, sets `verified` (pass) or `failing` (fail). Ticked boxes never verify a 👤 AC.
4. If no merged PR touches the AC and at least one open PR does → `in_progress` (from that PR's `openedAt`). Otherwise `not_started`.
5. ACs that are not in the current scope version are ignored. Closed (unmerged) PRs are ignored.

Each transition is recorded in `history` with the PR's `openedAt`/`mergedAt` or the result's `testedAt`. A merged PR also contributes its `openedAt`, so an AC is `in_progress` from the moment the first touching PR was opened. Human results for a 👤 AC only count once the AC has been delivered (a merged PR touches it). Events at the same instant are ordered opened → merged → tested, then by PR number.

**Simplifications compared with README §3.3** (to revisit when the parser and ingestion exist):
- `in_progress` uses only "open PR". Commits aren't in the mock data.
- The `failed` test plan mark stands for "a later PR reports it failing". The text convention for it is defined when the parser is built.

### 4.2 Rollups (`rollup.ts`)

- **Total** = number of ACs in the current scope version
- **Completion %** = `verified` ÷ total
- **Delivery %** = (`implemented` + `pending_user_testing` + `verified`) ÷ total
- **Unverified work** = Delivery % − Completion %
- **At risk** = `failing` + `regressed` (shown separately; not counted in Delivery %)
- **Pending user testing** = count of `pending_user_testing`, plus the age of the oldest
- Counts per state for the breakdown bar
- 0 ACs → 0%, never `NaN`. No priority weighting in this round.

### 4.3 Burn‑up (`burnup.ts`)

One point per calendar day from the first version's `lockedAt` to `DEMO_NOW`. Each point has:
- `scope` = number of ACs in the scope version active on that day
- `delivered` and `verified` = counts replayed from each AC's `history` as of the end of that day

ACs added in a later version are counted from that version's `lockedAt`.

### 4.4 Activity feed (`activity.ts`)

The last 10 events, newest first, built from: PR opened, PR merged, human test recorded, SCR raised, SCR decided, scope version locked. Each event has a timestamp, a short label and an optional link target (task, PR, AC).

## 5. Repository interface

```ts
interface PulseRepository {
  getPortfolio(): Promise<PortfolioRow[]>
  getProjectOverview(projectId: string): Promise<ProjectOverview | null>
}
```

- `PortfolioRow`: project id, name, kind, board, current scope label, completion %, delivery %, verified/total, open signals (total and high), pending approvals, pending user testing, last activity timestamp.
- `ProjectOverview`: project header data (name, kind, board, repo, current scope label, lockedAt, approvedBy, pending approvals count), rollup, per‑state counts, burn‑up series, top 5 signals (severity, then oldest first), last 10 activity events.

View models are plain serialisable objects (ISO strings for dates). `getRepository()` returns the mock implementation. The mock repository combines `lib/mock` data with `lib/progress` functions; the UI never imports `lib/mock` directly.

## 6. Screens

### 6.1 Portfolio (`/`)

- **Totals strip:** projects, open signals (high‑severity shown separately), pending approvals, pending user testing.
- **Projects table**, one row per project: name with kind and board badges, current scope version, progress bar (verified segment inside the delivered segment) labelled "Completion 42% · Delivery 61%", ACs verified/total, open signals, pending approvals, pending user testing, last activity (relative to the demo clock). The row links to the project overview.

### 6.2 Project overview (`/projects/[projectId]`)

- **Project layout header:** name, kind and board badges, repo link, "Scope v1.1 · locked 22 Sep by …", a "N pending approval(s)" badge when N > 0.
- **Sidebar:** the README §5 project screens (Overview, User testing, Scope, Tasks, Evidence, Approvals, Changelog, Metrics). Only Overview is active; the others are shown disabled with a "soon" label.
- **KPI cards:** Completion %, Delivery %, Unverified work, Pending user testing (count and oldest age), At risk.
- **AC state breakdown:** one stacked horizontal bar across the 7 states, with legend and counts.
- **Burn‑up chart:** scope, delivered and verified lines over time.
- **Top signals:** up to 5, each with severity, message, suggested action, age and links.
- **Recent activity:** the last 10 events.

### 6.3 Errors and empty states

- Unknown `projectId` → `notFound()` → the root `src/app/not-found.tsx` with a link back to the Portfolio. (A `notFound()` thrown in a layout is handled by the parent segment, so a not-found file next to the project layout would never be used.)
- Signals, activity and pending lists each show a short empty‑state message when empty.

## 7. Demo data

All timestamps are relative to `DEMO_NOW` (16 Oct 2026, 09:00).

| | A · Expense tracker | B · Customer portal | C · Intelligent Flow |
|---|---|---|---|
| Kind / board | greenfield / none (Pulse is the board) | brownfield / GitHub Issues | brownfield / Jira `CTOACT` + GitHub |
| CI | yes | yes | yes |
| Scope | v1 locked 6 Oct; 4 features, ~16 ACs, 3 👤 | baseline v1 locked 22 Sep (~18 ACs); v1.1 locked 6 Oct after an approved SCR adds 2 ACs, so the burn‑up shows a step | v1 from the scope doc: 7 features, 28 ACs, 3 👤 (AC‑3.1.5, AC‑5.1.5, AC‑6.1.4), tasks T‑01…T‑17 with CTOACT keys where they map; locked 2 Oct 2026 as a baseline, statuses illustrative |
| Story | agents mid‑way (~45% delivered); **one pending SCR** raised from an agent PR's Notes | gap‑report baseline; **one regressed AC**; **red main** signal | most features partly implemented with little test‑plan evidence, so a large gap between Delivery and Completion |
| Signals (mocked) | pending decision, stalled task, PR format issue | red main, regression, ticked but red | unplanned work, unchecked ACs merged, pending user testing |

**Project C rules:**
- Features, stories, ACs and tasks come from `docs/demo/intelligent-flow-scope.md`.
- Nothing from that doc's **review notes** goes into the mocks or the UI. Signal wording stays neutral (e.g. "Merged PRs with no task link").
- The UI calls Intelligent Flow's product a "dashboard", never a "console".

## 8. Testing and verification

**Vitest (written test‑first):**
- `deriveAcStates`: one test per rule in 4.1, plus a 👤 AC that fails after an earlier pass, a project with `ci: 'none'`, an `implemented` AC that is never moved down, an AC touched only via the test plan, CI `pending` on a merged PR, closed PRs ignored, and ACs outside the current version ignored.
- `rollup`: percentages, at‑risk count, 0 ACs → 0%.
- `burnup`: the scope step when v1.1 is locked; `scope` never decreases in the mock data; series ends at `DEMO_NOW`.
- `activity`: ordering and the 10‑item limit.
- **Mock integrity:** every AC, task, story and PR reference resolves; IDs are unique per project; each project tells its intended story (A has exactly one pending SCR; B has exactly one `regressed` AC and a v1.1; C has 7 features, 28 ACs and 3 👤 ACs).
- Repository: `getPortfolio()` returns 3 rows; `getProjectOverview(id)` returns data; an unknown ID returns `null`.
- Components (Testing Library): projects table renders rows and links; KPI cards format numbers; lists show empty states.

**Playwright smoke tests** (Chromium, against `next build && next start`):
- Portfolio shows 3 projects; clicking Intelligent Flow opens its overview.
- Overview shows the KPI cards, a rendered burn‑up SVG, signals and activity. An unknown project shows the not‑found page.

**Definition of done:** `lint`, `typecheck`, `test`, `build` and `test:e2e` all pass, and both screens have been checked in the browser in light and dark mode at laptop width.
