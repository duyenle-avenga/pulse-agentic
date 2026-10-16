# New Project Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-through New project wizard that creates "Intelligent Flow v2" from prefilled JSON, persists only decisions in localStorage, shows the locked project on the Portfolio and its Overview, reorders the Portfolio totals, and removes the burn-up chart.

**Architecture:** Read-only wizard content is JSON served by the repository (`getPlannerDraft`). Decisions (story approvals, v1 lock) live in a `DecisionStore` backed by localStorage. Client components combine the two with a pure `applyDecisions()` into a normal `ProjectData`, then reuse the existing pure progress functions, new shared view-model helpers, and the existing presentational components.

**Tech Stack:** Next.js 16.4 (App Router, `src/`), React 19 (`useSyncExternalStore`), Tailwind v4, shadcn/ui base-nova (`Button`, `Card`, `Badge`, `Table`), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-new-project-wizard-design.md`

## Conventions for every task

- Run commands from the repo root (`C:\Users\Myduyen.Lengo\Documents\agentic project manager`) in Git Bash. Quote paths: the folder name has spaces. Quote bracketed paths like `"src/app/projects/[projectId]/page.tsx"`.
- Branch `feat/poc-foundation`. Commit with the message given and a second `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (only this trailer).
- Never read, print or stage `.env` or `.env.local`. Stage files by explicit path, never `git add -A` / `git add .`.
- Code style: no semicolons, single quotes, 2-space indent (match existing files).
- Before committing, run the commands the step names. `npm run typecheck` and `npm run lint` must always pass.
- Next.js 16 may differ from what you know: if an API looks off, read the guide in `node_modules/next/dist/docs/`.
- The wizard's project id is `intelligent-flow-v2`. Project C (`intelligent-flow`) must not change.
- Nothing from the scope doc's "Review notes" section may appear anywhere. Intelligent Flow's UI is a "dashboard", never a "console".

## File map

| File | Responsibility |
|---|---|
| `src/lib/domain/planner.ts` | `PlannerDraft`, `PlannerBrief`, `PlannerQuestion`, `PlannedTask`, `StoryDecision`, `ProjectDecisions`, `EMPTY_DECISIONS`, `WIZARD_PROJECT_ID` |
| `src/lib/mock/planner/intelligent-flow-v2/{brief,questions,scope,tasks}.json` | Wizard content (as if from the planner LLM) |
| `src/lib/mock/planner/index.ts` | Typed loader; exports `intelligentFlowV2`, `ALL_DRAFTS` |
| `src/lib/progress/applyDecisions.ts` | Draft + decisions → `ProjectData` (pure) |
| `src/lib/decisions/store.ts` | `DecisionStore` interface |
| `src/lib/decisions/local-storage-store.ts` | localStorage implementation |
| `src/lib/decisions/use-decisions.ts` | `getDecisionStore()`, `useDecisions()`, `useIsClient()` (client) |
| `src/lib/data/view-models.ts` | `toProjectHeader`, `toPortfolioRow`, `toProjectOverview` (pure) |
| `src/lib/wizard/ticket-markdown.ts` | Task → README §3.2 ticket text |
| `src/components/portfolio/portfolio-view.tsx` | Client: server rows + locked draft row, totals, count, table |
| `src/components/project/project-shell.tsx` | Header + sidebar + content grid (shared) |
| `src/components/project/overview-content.tsx` | KPI cards, state bar, signals, activity (shared) |
| `src/components/project/draft-project-layout.tsx`, `draft-overview.tsx` | Client versions for Intelligent Flow v2 |
| `src/components/wizard/*` | `Wizard`, `Stepper`, `DescribeStep`, `QuestionsStep`, `ReviewStep`, `LockedStep`, `TaskTicket` |
| `src/app/projects/new/page.tsx` | Wizard route |
| `e2e/wizard.spec.ts` | Click-through smoke test |

---

### Task 1: Remove the burn-up

**Files:**
- Delete: `src/lib/progress/burnup.ts`, `src/lib/progress/burnup.test.ts`, `src/components/project/burnup-chart.tsx`, `src/components/ui/chart.tsx`
- Modify: `src/lib/data/repository.ts`, `src/lib/data/mock-repository.ts`, `src/lib/data/mock-repository.test.ts`, `src/lib/mock/project-b.test.ts`, `"src/app/projects/[projectId]/page.tsx"`, `e2e/overview.spec.ts`, `package.json`, `package-lock.json`, and any comment that still mentions the burn-up

- [ ] **Step 1: Delete the files and the dependency**

```bash
git rm -q src/lib/progress/burnup.ts src/lib/progress/burnup.test.ts src/components/project/burnup-chart.tsx src/components/ui/chart.tsx
npm uninstall recharts
```

- [ ] **Step 2: Remove `burnup` from the repository**

In `src/lib/data/repository.ts` delete the line `import type { BurnupPoint } from '@/lib/progress/burnup'` and the field `burnup: BurnupPoint[]` from `ProjectOverview`.

In `src/lib/data/mock-repository.ts` delete `import { burnup } from '@/lib/progress/burnup'` and the line `burnup: burnup(data.project, statuses, now),`. Leave the `now` parameter for now (Task 2 removes it).

- [ ] **Step 3: Update tests**

In `src/lib/data/mock-repository.test.ts`, in the test `'returns rollup, burn-up, top signals and activity'`, rename it to `'returns rollup, top signals and activity'` and delete the two lines asserting `o.burnup[0].date` and `o.burnup.at(-1)?.date`.

In `src/lib/mock/project-b.test.ts` delete the import `import { burnup } from '@/lib/progress/burnup'`, the import of `DEMO_NOW` if it becomes unused, and the whole test `'shows a scope step on the day v1.1 was locked, and scope never shrinks'`.

In `e2e/overview.spec.ts` rename the first test to `'overview shows KPIs, state bar, signals and activity'` and delete the line `await expect(page.locator('svg.recharts-surface').first()).toBeVisible()`.

- [ ] **Step 4: Remove the card from the Overview page**

Replace `"src/app/projects/[projectId]/page.tsx"` with:

```tsx
import { notFound } from 'next/navigation'
import { AcStateBar } from '@/components/project/ac-state-bar'
import { ActivityFeed } from '@/components/project/activity-feed'
import { KpiCards } from '@/components/project/kpi-cards'
import { SignalsList } from '@/components/project/signals-list'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const overview = await getRepository().getProjectOverview(projectId)
  if (!overview) notFound()
  const now = getNow()

  return (
    <div className="space-y-6">
      <KpiCards rollup={overview.rollup} now={now} />
      <AcStateBar counts={overview.rollup.counts} total={overview.rollup.total} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SignalsList signals={overview.topSignals} now={now} />
        <ActivityFeed events={overview.activity} now={now} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Fix leftover mentions**

Run `grep -rni "burn" src e2e ARCHITECTURE.md` and update every remaining comment (e.g. in `src/components/labels.ts` or `src/app/globals.css`) so it no longer mentions a burn-up chart. Don't change colour values. `stateAt` and AC `history` stay (history is used by `rollup`).

- [ ] **Step 6: Verify**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: all pass; no file imports `recharts` or `@/components/ui/chart` (`grep -rn "recharts\|ui/chart" src` prints nothing).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/data src/lib/mock/project-b.test.ts "src/app/projects/[projectId]/page.tsx" e2e/overview.spec.ts
git add -u src   # stages the deletions and comment edits under src only
git status --short   # check: nothing outside the intended files, no .env
git commit -m "refactor: remove the burn-up chart" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared view-model helpers

**Files:**
- Create: `src/lib/data/view-models.ts`, `src/lib/data/view-models.test.ts`
- Modify: `src/lib/data/mock-repository.ts`, `src/lib/data/mock-repository.test.ts`, `src/lib/data/index.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/data/view-models.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { customerPortal } from '@/lib/mock/project-b'
import { expenseTracker } from '@/lib/mock/project-a'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

describe('view models', () => {
  it('builds a portfolio row', () => {
    expect(toPortfolioRow(customerPortal)).toMatchObject({
      id: 'customer-portal', scopeLabel: 'v1.1', completionPct: 60, deliveryPct: 70, verified: 12, total: 20,
      openSignals: 3, highSignals: 2, pendingApprovals: 0, pendingUserTesting: 0,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
  })

  it('builds a header with pending approvals', () => {
    expect(toProjectHeader(expenseTracker)).toMatchObject({ id: 'expense-tracker', scopeLabel: 'v1', approvedBy: 'Maya Patel', pendingApprovals: 1 })
  })

  it('builds an overview with signals sorted by severity and the last 10 events', () => {
    const o = toProjectOverview(customerPortal)
    expect(o.rollup.total).toBe(20)
    expect(o.topSignals.map((s) => s.severity)).toEqual(['high', 'high', 'medium'])
    expect(o.activity).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run it to check it fails**

Run: `npx vitest run src/lib/data/view-models.test.ts`
Expected: FAIL, `Failed to resolve import "./view-models"`.

- [ ] **Step 3: Write `src/lib/data/view-models.ts`**

```ts
import { currentScope } from '@/lib/domain/scope'
import type { ProjectData, Severity } from '@/lib/domain/types'
import { recentActivity } from '@/lib/progress/activity'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import type { PortfolioRow, ProjectHeaderData, ProjectOverview } from './repository'

// Pure mappers from ProjectData to the view models. Used by the server repository and by client components.

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

export function toProjectHeader({ project, scrs }: ProjectData): ProjectHeaderData {
  const scope = currentScope(project)
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    kind: project.kind,
    board: project.board,
    boardKey: project.boardKey,
    repoUrl: project.repoUrl,
    scopeLabel: scope.label,
    lockedAt: scope.lockedAt,
    approvedBy: scope.approvedBy,
    pendingApprovals: scrs.filter((s) => s.status === 'pending').length,
  }
}

export function toPortfolioRow(data: ProjectData): PortfolioRow {
  const header = toProjectHeader(data)
  const r = rollup(deriveAcStates(data))
  return {
    id: header.id,
    name: header.name,
    kind: header.kind,
    board: header.board,
    boardKey: header.boardKey,
    scopeLabel: header.scopeLabel,
    completionPct: r.completionPct,
    deliveryPct: r.deliveryPct,
    verified: r.counts.verified,
    total: r.total,
    openSignals: data.signals.length,
    highSignals: data.signals.filter((s) => s.severity === 'high').length,
    pendingApprovals: header.pendingApprovals,
    pendingUserTesting: r.pendingUserTesting,
    lastActivityAt: recentActivity(data, 1)[0]?.at ?? null,
  }
}

export function toProjectOverview(data: ProjectData): ProjectOverview {
  const topSignals = [...data.signals]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || Date.parse(a.raisedAt) - Date.parse(b.raisedAt))
    .slice(0, 5)
  return {
    header: toProjectHeader(data),
    rollup: rollup(deriveAcStates(data)),
    topSignals,
    activity: recentActivity(data),
  }
}
```

- [ ] **Step 4: Make the mock repository use them**

Replace `src/lib/data/mock-repository.ts` with:

```ts
import type { ProjectData } from '@/lib/domain/types'
import type { PulseRepository } from './repository'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

export function createMockRepository(projects: ProjectData[]): PulseRepository {
  const find = (id: string) => projects.find((d) => d.project.id === id)

  return {
    async getPortfolio() {
      return projects.map(toPortfolioRow)
    },

    async getProjectHeader(projectId) {
      const data = find(projectId)
      return data ? toProjectHeader(data) : null
    },

    async getProjectOverview(projectId) {
      const data = find(projectId)
      return data ? toProjectOverview(data) : null
    },
  }
}
```

In `src/lib/data/index.ts` change `createMockRepository(ALL_PROJECTS, DEMO_NOW)` to `createMockRepository(ALL_PROJECTS)` (keep the `DEMO_NOW` import; `getNow` uses it).

In `src/lib/data/mock-repository.test.ts` replace every `createMockRepository(ALL_PROJECTS, DEMO_NOW)` / `createMockRepository([custom], DEMO_NOW)` with `createMockRepository(ALL_PROJECTS)` / `createMockRepository([custom])`, and remove the `DEMO_NOW` import if unused.

- [ ] **Step 5: Verify**

Run: `npx vitest run src/lib/data && npm run typecheck && npm run lint`
Expected: PASS (view-models 3 tests + repository tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/data
git commit -m "refactor: share view-model helpers between server and client" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Planner types, JSON content and loader

**Files:**
- Create: `src/lib/domain/planner.ts`, `src/lib/mock/planner/intelligent-flow-v2/{brief,questions,scope,tasks}.json`, `src/lib/mock/planner/index.ts`
- Test: `src/lib/mock/planner/planner.test.ts`

- [ ] **Step 1: Write `src/lib/domain/planner.ts`** (types only)

```ts
import type { BoardKind, Feature, IsoDateTime, Task } from './types'

/** The project the demo wizard creates. */
export const WIZARD_PROJECT_ID = 'intelligent-flow-v2'

export interface PlannerBrief {
  projectId: string
  name: string
  goal: string
  users: string
  constraints: string
  tech: string
  nonGoals: string
  approver: string
  repoUrl: string
  board: BoardKind
  boardKey?: string
}

export interface PlannerQuestion {
  id: string
  question: string
  options: string[]
  answer: string
}

export type PlannedTask = Omit<Task, 'projectId'>

/** What the planner (an LLM later; JSON in the POC) proposes for a new project. */
export interface PlannerDraft {
  brief: PlannerBrief
  questions: PlannerQuestion[]
  scope: { features: Feature[] }
  tasks: PlannedTask[]
}

export type StoryDecision = 'approved' | 'rejected'

/** Human decisions about a draft. The only thing stored in localStorage. */
export interface ProjectDecisions {
  stories: Record<string, StoryDecision>
  lock: { lockedAt: IsoDateTime; lockedBy: string } | null
}

export const EMPTY_DECISIONS: ProjectDecisions = Object.freeze({ stories: Object.freeze({}), lock: null }) as ProjectDecisions
```

- [ ] **Step 2: Write `brief.json`** — `src/lib/mock/planner/intelligent-flow-v2/brief.json`

```json
{
  "projectId": "intelligent-flow-v2",
  "name": "Intelligent Flow v2",
  "goal": "Work items move through an AI-assisted SDLC (Claude Code agents), stopping at governance gates where a named person must decide. Every decision is recorded, so an Evidence Pack can be produced for audit.",
  "users": "Client team members who raise work, approvers and delivery leads who decide at each gate, and auditors who review the evidence.",
  "constraints": "Nothing moves forward without a named person deciding. Every decision must be traceable to the artifact it was made against.",
  "tech": "NestJS, Postgres, a web dashboard, Claude Code agents.",
  "nonGoals": "Replacing Jira or Slack. Changing how client teams write code.",
  "approver": "Demo approver",
  "repoUrl": "https://github.com/Avenga-Engineering-Acceleration/intelligent-flow",
  "board": "jira",
  "boardKey": "CTOACT"
}
```

- [ ] **Step 3: Write `questions.json`**

```json
[
  {
    "id": "q-intake",
    "question": "Which channels should start a work item at launch?",
    "options": ["Jira only", "Jira and Slack", "Slack only"],
    "answer": "Jira and Slack"
  },
  {
    "id": "q-approver",
    "question": "Who may approve a gate?",
    "options": ["Anyone on the project", "A named person in the configured role", "Any lead"],
    "answer": "A named person in the configured role"
  },
  {
    "id": "q-retention",
    "question": "How long must evidence be kept?",
    "options": ["1 year", "Locked retention, set per client", "Until the project ends"],
    "answer": "Locked retention, set per client"
  },
  {
    "id": "q-connector",
    "question": "Which code host should the first deploy connector support?",
    "options": ["GitHub", "GitLab", "Both"],
    "answer": "GitHub"
  }
]
```

- [ ] **Step 4: Generate `scope.json` from project C's scope** (same features, stories and ACs)

Create a temporary file `src/lib/mock/planner/gen-scope.test.ts`:

```ts
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { currentScope } from '@/lib/domain/scope'
import { intelligentFlow } from '../project-c'

it('writes scope.json', () => {
  const scope = { features: currentScope(intelligentFlow.project).features }
  writeFileSync('src/lib/mock/planner/intelligent-flow-v2/scope.json', JSON.stringify(scope, null, 2) + '\n')
})
```

Run `npx vitest run src/lib/mock/planner/gen-scope.test.ts`, then delete the temporary file: `rm src/lib/mock/planner/gen-scope.test.ts`. Open `scope.json` and check it has 7 features, `"humanTest": true` on AC-3.1.5, AC-5.1.5 and AC-6.1.4, and no other keys.

- [ ] **Step 5: Write `tasks.json`** (ids, ACs and dependencies match project C; titles and intents are written for the tickets)

```json
[
  { "id": "T-01", "title": "Jira intake", "intent": "Connect Jira intake to work item creation, with dedupe.", "storyId": "US-1.1", "acIds": ["AC-1.1.1", "AC-1.1.3", "AC-1.1.4"], "dependsOn": [] },
  { "id": "T-02", "title": "Slack intake", "intent": "Connect Slack intake to work item creation and reply with the link.", "storyId": "US-1.1", "acIds": ["AC-1.1.2"], "dependsOn": ["T-01"] },
  { "id": "T-03", "title": "Start the flow", "intent": "Start the configured flow when a work item is created.", "storyId": "US-2.1", "acIds": ["AC-2.1.1"], "dependsOn": ["T-01"] },
  { "id": "T-04", "title": "Agent stage", "intent": "Launch the Claude Code agent stage with the pinned context bundle.", "storyId": "US-2.1", "acIds": ["AC-2.1.2"], "dependsOn": ["T-03"] },
  { "id": "T-05", "title": "Artifact hash check", "intent": "Verify the agent's artifact hash before advancing.", "storyId": "US-2.1", "acIds": ["AC-2.1.3"], "dependsOn": ["T-04"] },
  { "id": "T-06", "title": "Resume after restart", "intent": "Resume in-flight work items after a restart.", "storyId": "US-2.1", "acIds": ["AC-2.1.4"], "dependsOn": ["T-03"] },
  { "id": "T-07", "title": "Gate approvals", "intent": "Create a pending approval at each gate; approve or send back.", "storyId": "US-3.1", "acIds": ["AC-3.1.1", "AC-3.1.2"], "dependsOn": ["T-03"] },
  { "id": "T-08", "title": "No self-approval", "intent": "Block a person from approving a gate on work they triggered or produced.", "storyId": "US-3.1", "acIds": ["AC-3.1.3"], "dependsOn": ["T-07"] },
  { "id": "T-09", "title": "Approval SLA", "intent": "Flag overdue approvals and notify the approver.", "storyId": "US-3.1", "acIds": ["AC-3.1.4"], "dependsOn": ["T-07"] },
  { "id": "T-10", "title": "Agent escalations", "intent": "Let an agent ask a person a question, pass the answer back, and cap repeated questions.", "storyId": "US-4.1", "acIds": ["AC-4.1.1", "AC-4.1.2", "AC-4.1.3"], "dependsOn": ["T-04"] },
  { "id": "T-11", "title": "Event log", "intent": "Write every stage, gate and escalation event to an append-only log.", "storyId": "US-5.1", "acIds": ["AC-5.1.1"], "dependsOn": ["T-03"] },
  { "id": "T-12", "title": "Evidence Pack", "intent": "Assemble and export the Evidence Pack for a work item.", "storyId": "US-5.1", "acIds": ["AC-5.1.2", "AC-5.1.5"], "dependsOn": ["T-11"] },
  { "id": "T-13", "title": "Tamper detection", "intent": "Detect altered events and keep evidence in write-once storage.", "storyId": "US-5.1", "acIds": ["AC-5.1.3", "AC-5.1.4"], "dependsOn": ["T-11"] },
  { "id": "T-14", "title": "Dashboard: approvals", "intent": "Dashboard sign-in, the pending approvals list and the gate screen.", "storyId": "US-6.1", "acIds": ["AC-6.1.1", "AC-6.1.2", "AC-3.1.5"], "dependsOn": ["T-07"] },
  { "id": "T-15", "title": "Dashboard: timeline", "intent": "Show a work item's timeline of stages, decisions and escalations.", "storyId": "US-6.1", "acIds": ["AC-6.1.3", "AC-6.1.4"], "dependsOn": ["T-11"] },
  { "id": "T-16", "title": "Merge and deploy", "intent": "Merge after final approval, run the deploy stage and record the result.", "storyId": "US-7.1", "acIds": ["AC-7.1.1", "AC-7.1.2"], "dependsOn": ["T-07"] },
  { "id": "T-17", "title": "Connector testkit", "intent": "Run the shared connector testkit for the GitHub connector in CI.", "storyId": "US-7.1", "acIds": ["AC-7.1.3"], "dependsOn": [] }
]
```

- [ ] **Step 6: Write the failing test** — `src/lib/mock/planner/planner.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { intelligentFlow } from '../project-c'
import { ALL_DRAFTS, intelligentFlowV2 } from './index'

const draft = intelligentFlowV2
const stories = draft.scope.features.flatMap((f) => f.stories)
const acs = draft.scope.features.flatMap((f) => f.stories.flatMap((s) => s.acs))
const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('planner draft: Intelligent Flow v2', () => {
  it('is the only draft and uses its own project id', () => {
    expect(ALL_DRAFTS).toEqual([draft])
    expect(draft.brief.projectId).toBe('intelligent-flow-v2')
    expect(draft.brief.name).toBe('Intelligent Flow v2')
  })

  it('has 7 features, 7 stories, 28 ACs (3 👤) and 17 tasks', () => {
    expect(draft.scope.features).toHaveLength(7)
    expect(stories).toHaveLength(7)
    expect(acs).toHaveLength(28)
    expect(acs.filter((a) => a.humanTest).map((a) => a.id)).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
    expect(draft.tasks).toHaveLength(17)
  })

  it('copies the scope from the scope doc (same as project C)', () => {
    expect(draft.scope.features).toEqual(currentScope(intelligentFlow.project).features)
    expect(acsOf(currentScope(intelligentFlow.project))).toHaveLength(28)
  })

  it('keeps task ACs and dependencies in line with project C', () => {
    for (const t of draft.tasks) {
      const c = intelligentFlow.tasks.find((x) => x.id === t.id)
      expect(c, t.id).toBeDefined()
      expect({ storyId: t.storyId, acIds: t.acIds, dependsOn: t.dependsOn }, t.id).toEqual({ storyId: c?.storyId, acIds: c?.acIds, dependsOn: c?.dependsOn })
      expect(t.intent, t.id).not.toBe('')
    }
  })

  it('has unique ids and only valid references', () => {
    expect(unique(stories.map((s) => s.id))).toBe(true)
    expect(unique(acs.map((a) => a.id))).toBe(true)
    expect(unique(draft.tasks.map((t) => t.id))).toBe(true)
    const acIds = acs.map((a) => a.id)
    const taskIds = draft.tasks.map((t) => t.id)
    for (const t of draft.tasks) {
      for (const id of t.acIds) expect(acIds, `${t.id} → ${id}`).toContain(id)
      for (const id of t.dependsOn) expect(taskIds, `${t.id} depends on ${id}`).toContain(id)
    }
  })

  it('prefills every question with one of its options', () => {
    expect(draft.questions).toHaveLength(4)
    for (const q of draft.questions) expect(q.options).toContain(q.answer)
  })

  it('stays clear of the review notes and never says console', () => {
    const text = JSON.stringify(draft)
    for (const term of ['console', 'React', 'MUI', 'Radix', 'prototype', 'bulk', 'unassigned', 'ADR', 'mvp-stack', 'apps/']) {
      expect(text, term).not.toMatch(new RegExp(term.replace('/', '\\/'), 'i'))
    }
  })
})
```

Run: `npx vitest run src/lib/mock/planner`
Expected: FAIL, `Failed to resolve import "./index"`.

- [ ] **Step 7: Write the loader** — `src/lib/mock/planner/index.ts`

```ts
import type { PlannerBrief, PlannerDraft, PlannerQuestion, PlannedTask } from '@/lib/domain/planner'
import type { BoardKind, Feature } from '@/lib/domain/types'
import brief from './intelligent-flow-v2/brief.json'
import questions from './intelligent-flow-v2/questions.json'
import scope from './intelligent-flow-v2/scope.json'
import tasks from './intelligent-flow-v2/tasks.json'

const BOARDS: readonly BoardKind[] = ['none', 'github', 'jira']

// JSON imports widen string unions to string, so check the one union field and then narrow.
function toBrief(raw: typeof brief): PlannerBrief {
  if (!BOARDS.includes(raw.board as BoardKind)) throw new Error(`Unknown board "${raw.board}" in brief.json`)
  return { ...raw, board: raw.board as BoardKind }
}

export const intelligentFlowV2: PlannerDraft = {
  brief: toBrief(brief),
  questions: questions satisfies PlannerQuestion[],
  scope: scope satisfies { features: Feature[] },
  tasks: tasks satisfies PlannedTask[],
}

export const ALL_DRAFTS: PlannerDraft[] = [intelligentFlowV2]
```

If `tsc` rejects a `satisfies` because of optional fields (e.g. `agent`, `externalKey` absent is fine; extra keys are not), fix the JSON, not the types. If `resolveJsonModule` is off in `tsconfig.json`, turn it on and report it.

- [ ] **Step 8: Verify**

Run: `npx vitest run src/lib/mock && npm run typecheck && npm run lint`
Expected: PASS (planner 7 tests; existing mock tests unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/lib/domain/planner.ts src/lib/mock/planner
git commit -m "feat: add Intelligent Flow v2 planner draft as JSON" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Repository `getPlannerDraft`

**Files:**
- Modify: `src/lib/data/repository.ts`, `src/lib/data/mock-repository.ts`, `src/lib/data/index.ts`, `src/lib/data/mock-repository.test.ts`

- [ ] **Step 1: Write the failing test** — add to `src/lib/data/mock-repository.test.ts`

At the top add `import { ALL_DRAFTS } from '@/lib/mock/planner'`, change the shared repository to `createMockRepository(ALL_PROJECTS, ALL_DRAFTS)`, and add:

```ts
describe('MockRepository.getPlannerDraft', () => {
  it('returns the Intelligent Flow v2 draft, or null for any other id', async () => {
    const draft = await repo.getPlannerDraft('intelligent-flow-v2')
    expect(draft?.brief.name).toBe('Intelligent Flow v2')
    expect(await repo.getPlannerDraft('intelligent-flow')).toBeNull()
    expect(await repo.getPlannerDraft('nope')).toBeNull()
  })

  it('does not list drafts as projects', async () => {
    expect((await repo.getPortfolio()).map((r) => r.id)).not.toContain('intelligent-flow-v2')
    expect(await repo.getProjectHeader('intelligent-flow-v2')).toBeNull()
  })
})
```

Run: `npx vitest run src/lib/data/mock-repository.test.ts`
Expected: FAIL (`getPlannerDraft` does not exist / type error).

- [ ] **Step 2: Implement**

In `src/lib/data/repository.ts` add `import type { PlannerDraft } from '@/lib/domain/planner'` and add to `PulseRepository`:

```ts
  /** Read-only planner output for a project that is being created (the wizard). */
  getPlannerDraft(projectId: string): Promise<PlannerDraft | null>
```

In `src/lib/data/mock-repository.ts` change the signature to `createMockRepository(projects: ProjectData[], drafts: PlannerDraft[] = [])` (import the type from `@/lib/domain/planner`) and add the method:

```ts
    async getPlannerDraft(projectId) {
      return drafts.find((d) => d.brief.projectId === projectId) ?? null
    },
```

In `src/lib/data/index.ts` import `ALL_DRAFTS` from `@/lib/mock/planner` and create the repository with `createMockRepository(ALL_PROJECTS, ALL_DRAFTS)`. Do **not** re-export the view-model helpers from `index.ts`: client code imports `@/lib/data/view-models` directly, so the browser bundle never pulls in the mock data.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/lib/data && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data
git commit -m "feat: serve planner drafts from the repository" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `applyDecisions`

**Files:**
- Create: `src/lib/progress/applyDecisions.ts`
- Test: `src/lib/progress/applyDecisions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { applyDecisions } from './applyDecisions'
import { deriveAcStates } from './deriveAcStates'

const LOCK = { lockedAt: '2026-10-16T09:00:00+02:00', lockedBy: 'Demo approver' }
const allStoryIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))
const decide = (overrides: Record<string, 'approved' | 'rejected'> = {}): ProjectDecisions => ({
  stories: { ...Object.fromEntries(allStoryIds.map((id) => [id, 'approved' as const])), ...overrides },
  lock: LOCK,
})

describe('applyDecisions', () => {
  it('returns null until v1 is locked', () => {
    expect(applyDecisions(draft, EMPTY_DECISIONS)).toBeNull()
    expect(applyDecisions(draft, { ...decide(), lock: null })).toBeNull()
  })

  it('builds a greenfield project with one locked v1 and no evidence', () => {
    const data = applyDecisions(draft, decide())
    if (!data) throw new Error('expected data')
    expect(data.project).toMatchObject({ id: 'intelligent-flow-v2', name: 'Intelligent Flow v2', kind: 'greenfield', board: 'jira', boardKey: 'CTOACT', hasCi: true })
    expect(data.project.scopeVersions).toHaveLength(1)
    expect(currentScope(data.project)).toMatchObject({ label: 'v1', lockedAt: LOCK.lockedAt, approvedBy: 'Demo approver' })
    expect(acsOf(currentScope(data.project))).toHaveLength(28)
    expect(data.tasks).toHaveLength(17)
    expect(data.tasks.every((t) => t.projectId === 'intelligent-flow-v2')).toBe(true)
    expect([data.prs, data.humanTests, data.scrs, data.signals]).toEqual([[], [], [], []])
    expect(deriveAcStates(data).every((s) => s.state === 'not_started')).toBe(true)
  })

  it('leaves out rejected stories, empty features and tasks with no ACs left', () => {
    const data = applyDecisions(draft, decide({ 'US-4.1': 'rejected' }))
    if (!data) throw new Error('expected data')
    const scope = currentScope(data.project)
    expect(scope.features.map((f) => f.id)).not.toContain('F4')
    expect(acsOf(scope).map((a) => a.id)).not.toContain('AC-4.1.1')
    expect(data.tasks.map((t) => t.id)).not.toContain('T-10')
    expect(data.tasks).toHaveLength(16)
  })

  it('trims ACs of rejected stories from shared tasks and drops dependencies on removed tasks', () => {
    const data = applyDecisions(draft, decide({ 'US-3.1': 'rejected' }))
    if (!data) throw new Error('expected data')
    const t14 = data.tasks.find((t) => t.id === 'T-14')
    expect(t14?.acIds).toEqual(['AC-6.1.1', 'AC-6.1.2'])
    expect(t14?.dependsOn).toEqual([])
    expect(data.tasks.map((t) => t.id)).not.toContain('T-07')
  })
})
```

Run: `npx vitest run src/lib/progress/applyDecisions.test.ts`
Expected: FAIL, `Failed to resolve import "./applyDecisions"`.

- [ ] **Step 2: Write `src/lib/progress/applyDecisions.ts`**

```ts
import type { PlannerDraft, ProjectDecisions } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'

/** Turns the planner draft plus human decisions into a normal project. Null until v1 is locked. */
export function applyDecisions(draft: PlannerDraft, decisions: ProjectDecisions): ProjectData | null {
  if (!decisions.lock) return null
  const { brief } = draft

  const features = draft.scope.features
    .map((f) => ({ ...f, stories: f.stories.filter((s) => decisions.stories[s.id] === 'approved') }))
    .filter((f) => f.stories.length > 0)
  const v1AcIds = new Set(features.flatMap((f) => f.stories.flatMap((s) => s.acs.map((a) => a.id))))

  const kept = draft.tasks
    .map((t) => ({ ...t, acIds: t.acIds.filter((id) => v1AcIds.has(id)) }))
    .filter((t) => t.acIds.length > 0)
  const keptIds = new Set(kept.map((t) => t.id))

  return {
    project: {
      id: brief.projectId,
      name: brief.name,
      description: brief.goal,
      kind: 'greenfield',
      board: brief.board,
      boardKey: brief.boardKey,
      repoUrl: brief.repoUrl,
      hasCi: true,
      scopeVersions: [{ label: 'v1', lockedAt: decisions.lock.lockedAt, approvedBy: decisions.lock.lockedBy, features }],
    },
    tasks: kept.map((t) => ({ ...t, projectId: brief.projectId, dependsOn: t.dependsOn.filter((id) => keptIds.has(id)) })),
    prs: [],
    humanTests: [],
    scrs: [],
    signals: [],
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/lib/progress && npm run typecheck && npm run lint`
Expected: PASS (applyDecisions 4 tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/progress/applyDecisions.ts src/lib/progress/applyDecisions.test.ts
git commit -m "feat: combine planner draft and decisions into a project" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Decision store

**Files:**
- Create: `src/lib/decisions/store.ts`, `src/lib/decisions/local-storage-store.ts`, `src/lib/decisions/use-decisions.ts`
- Test: `src/lib/decisions/local-storage-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DECISIONS_KEY, createLocalStorageDecisionStore } from './local-storage-store'

const P = 'intelligent-flow-v2'
const AT = '2026-10-16T09:00:00+02:00'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v },
    data,
  }
}

describe('LocalStorageDecisionStore', () => {
  let storage: ReturnType<typeof fakeStorage>
  beforeEach(() => { storage = fakeStorage() })
  const make = () => createLocalStorageDecisionStore(() => storage as unknown as Storage)

  it('returns empty decisions for an unknown project', () => {
    expect(make().get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('records story decisions and persists them under one versioned key', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    store.decideStory(P, 'US-4.1', 'rejected')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved', 'US-4.1': 'rejected' })
    expect(JSON.parse(storage.data[DECISIONS_KEY])[P].stories).toEqual({ 'US-1.1': 'approved', 'US-4.1': 'rejected' })
    expect(make().get(P).stories['US-4.1']).toBe('rejected') // a new store reads it back
  })

  it('decideAll only touches undecided stories', () => {
    const store = make()
    store.decideStory(P, 'US-2.1', 'rejected')
    store.decideAll(P, ['US-1.1', 'US-2.1', 'US-3.1'], 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved', 'US-2.1': 'rejected', 'US-3.1': 'approved' })
  })

  it('freezes decisions once locked, until reset', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    store.lock(P, AT, 'Demo approver')
    store.decideStory(P, 'US-1.1', 'rejected')
    store.decideAll(P, ['US-2.1'], 'approved')
    expect(store.get(P)).toEqual({ stories: { 'US-1.1': 'approved' }, lock: { lockedAt: AT, lockedBy: 'Demo approver' } })
    store.reset(P)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('returns the same object until something changes (stable snapshot)', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P)).toBe(store.get(P))
  })

  it('notifies subscribers on change, not on no-ops', () => {
    const store = make()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.decideStory(P, 'US-1.1', 'approved')
    store.decideStory(P, 'US-1.1', 'approved')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.decideStory(P, 'US-2.1', 'approved')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('treats corrupt JSON as empty and keeps working', () => {
    storage = fakeStorage({ [DECISIONS_KEY]: '{not json' })
    const store = make()
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved' })
  })

  it('keeps working in memory when storage throws', () => {
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    const store = createLocalStorageDecisionStore(() => throwing as unknown as Storage)
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved' })
  })

  it('works without any storage (server)', () => {
    const store = createLocalStorageDecisionStore(() => undefined)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
  })
})
```

Run: `npx vitest run src/lib/decisions`
Expected: FAIL, `Failed to resolve import "./local-storage-store"`.

- [ ] **Step 2: Write `src/lib/decisions/store.ts`**

```ts
import type { ProjectDecisions, StoryDecision } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'

/** Where human decisions live. localStorage in the POC; a DB-backed version replaces it later. */
export interface DecisionStore {
  /** Empty decisions if none. Returns the same object until something changes. */
  get(projectId: string): ProjectDecisions
  decideStory(projectId: string, storyId: string, decision: StoryDecision): void
  /** Applies the decision only to stories that are still undecided. */
  decideAll(projectId: string, storyIds: string[], decision: StoryDecision): void
  lock(projectId: string, lockedAt: IsoDateTime, lockedBy: string): void
  reset(projectId: string): void
  subscribe(listener: () => void): () => void
}
```

- [ ] **Step 3: Write `src/lib/decisions/local-storage-store.ts`**

```ts
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import type { DecisionStore } from './store'

export const DECISIONS_KEY = 'pulse-agentic:decisions:v1'

type AllDecisions = Record<string, ProjectDecisions>

const browserStorage = () => (typeof window === 'undefined' ? undefined : window.localStorage)

function normalize(value: unknown): AllDecisions {
  if (typeof value !== 'object' || value === null) return {}
  const out: AllDecisions = {}
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    const e = entry as Partial<ProjectDecisions> | null
    if (!e || typeof e !== 'object') continue
    out[id] = { stories: { ...(e.stories ?? {}) }, lock: e.lock ?? null }
  }
  return out
}

/** Every read and write is guarded: blocked storage or corrupt JSON just means "no saved decisions". */
export function createLocalStorageDecisionStore(storage: () => Storage | undefined = browserStorage): DecisionStore {
  let all: AllDecisions | null = null
  const listeners = new Set<() => void>()

  function load(): AllDecisions {
    if (all) return all
    try {
      const raw = storage()?.getItem(DECISIONS_KEY)
      all = raw ? normalize(JSON.parse(raw)) : {}
    } catch {
      all = {}
    }
    return all
  }

  function save(next: AllDecisions) {
    all = next
    try {
      storage()?.setItem(DECISIONS_KEY, JSON.stringify(next))
    } catch {
      // Keep the in-memory copy for this session.
    }
    for (const listener of listeners) listener()
  }

  function update(projectId: string, change: (current: ProjectDecisions) => ProjectDecisions) {
    const current = load()[projectId] ?? EMPTY_DECISIONS
    const next = change(current)
    if (next !== current) save({ ...load(), [projectId]: next })
  }

  return {
    get: (projectId) => load()[projectId] ?? EMPTY_DECISIONS,

    decideStory: (projectId, storyId, decision) =>
      update(projectId, (d) => (d.lock || d.stories[storyId] === decision ? d : { ...d, stories: { ...d.stories, [storyId]: decision } })),

    decideAll: (projectId, storyIds, decision) =>
      update(projectId, (d) => {
        const undecided = storyIds.filter((id) => !d.stories[id])
        if (d.lock || undecided.length === 0) return d
        return { ...d, stories: { ...d.stories, ...Object.fromEntries(undecided.map((id) => [id, decision])) } }
      }),

    lock: (projectId, lockedAt, lockedBy) => update(projectId, (d) => (d.lock ? d : { ...d, lock: { lockedAt, lockedBy } })),

    reset: (projectId) => {
      const current = load()
      if (!(projectId in current)) return
      const next = { ...current }
      delete next[projectId]
      save(next)
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
```

- [ ] **Step 4: Write `src/lib/decisions/use-decisions.ts`** (client hooks)

```ts
'use client'

import { useSyncExternalStore } from 'react'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { createLocalStorageDecisionStore } from './local-storage-store'
import type { DecisionStore } from './store'

const store = createLocalStorageDecisionStore()

export function getDecisionStore(): DecisionStore {
  return store
}

/** Decisions for one project. The server snapshot is empty, so the first client render matches the server. */
export function useDecisions(projectId: string): ProjectDecisions {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(projectId),
    () => EMPTY_DECISIONS,
  )
}

const noop = () => () => {}

/** False during server render and hydration, true afterwards. Use it to avoid a flash of the wrong state. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run src/lib/decisions && npm run typecheck && npm run lint`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/decisions
git commit -m "feat: add the localStorage decision store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ticket Markdown

**Files:**
- Create: `src/lib/wizard/ticket-markdown.ts`
- Test: `src/lib/wizard/ticket-markdown.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

Run: `npx vitest run src/lib/wizard`
Expected: FAIL, `Failed to resolve import "./ticket-markdown"`.

- [ ] **Step 2: Write `src/lib/wizard/ticket-markdown.ts`**

```ts
import type { AcceptanceCriterion, Task } from '@/lib/domain/types'

type TicketTask = Pick<Task, 'id' | 'title' | 'intent' | 'storyId' | 'dependsOn'>

/** A generated task as the short ticket from README §3.2, ready to paste for an agent. */
export function ticketMarkdown(task: TicketTask, acs: AcceptanceCriterion[]): string {
  const meta = [`Story: ${task.storyId}`, ...(task.dependsOn.length > 0 ? [`Depends on: ${task.dependsOn.join(', ')}`] : [])].join(' · ')
  return [
    `${task.id} · ${task.title}    ${meta}`,
    '',
    task.intent,
    '',
    'Acceptance criteria',
    ...acs.map((a) => `- [ ] ${a.id} ${a.text}${a.humanTest ? '   👤 human test' : ''}`),
    '',
    `PR: put \`${task.id}\` in the title and use the standard sections (Summary, Migration,`,
    'Test plan, Notes). Copy the ACs into "Test plan", tick each one you tested and',
    'say how (unit / integration / e2e). Leave 👤 items unticked for a human.',
  ].join('\n')
}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run src/lib/wizard && npm run typecheck && npm run lint` → PASS (2 tests).

```bash
git add src/lib/wizard
git commit -m "feat: render generated tasks as ticket Markdown" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Portfolio — totals order, project count, Intelligent Flow v2 row, New project button

**Files:**
- Create: `src/components/portfolio/portfolio-view.tsx`, `src/components/portfolio/portfolio-view.test.tsx`
- Modify: `src/components/portfolio/portfolio-totals.tsx`, `src/components/portfolio/portfolio-totals.test.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Update the totals test (fails first)** — replace the `it(...)` in `portfolio-totals.test.tsx` with:

```tsx
  it('shows approvals, user testing and signals, in that order, without a projects card', () => {
    render(<PortfolioTotals rows={[base, { ...base, id: 'b', highSignals: 2, pendingApprovals: 0, pendingUserTesting: 3 }]} />)
    const labels = [...document.querySelectorAll('[data-slot="card-description"]')].map((el) => el.textContent)
    expect(labels).toEqual(['Pending approvals', 'Pending user testing', 'Open signals'])
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    expect(within(getCard('Pending approvals')).getByText('1')).toBeInTheDocument()
    expect(within(getCard('Pending user testing')).getByText('3')).toBeInTheDocument()
    expect(within(getCard('Open signals')).getByText('6')).toBeInTheDocument()
    expect(screen.getByText('2 high')).toBeInTheDocument()
  })
```

(Check `src/components/ui/card.tsx` for the actual `data-slot` of `CardDescription`; adjust the selector if it differs.)

- [ ] **Step 2: Write the PortfolioView test**

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PortfolioRow } from '@/lib/data'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { PortfolioView } from './portfolio-view'

const NOW = '2026-10-16T09:00:00+02:00'
const row: PortfolioRow = {
  id: 'a', name: 'Project A', kind: 'greenfield', board: 'none', scopeLabel: 'v1', completionPct: 10, deliveryPct: 20,
  verified: 1, total: 10, openSignals: 0, highSignals: 0, pendingApprovals: 0, pendingUserTesting: 0, lastActivityAt: null,
}
const store = getDecisionStore()
const P = draft.brief.projectId

describe('PortfolioView', () => {
  beforeEach(() => store.reset(P))

  it('shows only server projects while Intelligent Flow v2 is not locked', () => {
    render(<PortfolioView rows={[row]} draft={draft} now={NOW} />)
    expect(screen.getByText('1 project')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Intelligent Flow v2' })).not.toBeInTheDocument()
  })

  it('adds Intelligent Flow v2 at 0% once v1 is locked', () => {
    store.decideAll(P, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(P, NOW, 'Demo approver')
    render(<PortfolioView rows={[row]} draft={draft} now={NOW} />)
    expect(screen.getByText('2 projects')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intelligent Flow v2' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('Completion 0% · Delivery 0%')).toBeInTheDocument()
    expect(screen.getByText('0 / 28')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/portfolio`
Expected: FAIL (new order not implemented; `./portfolio-view` missing).

- [ ] **Step 3: Reorder the totals** — in `portfolio-totals.tsx` replace the `items` array and the grid class:

```tsx
  const items = [
    { label: 'Pending approvals', value: sum((r) => r.pendingApprovals) },
    { label: 'Pending user testing', value: sum((r) => r.pendingUserTesting) },
    { label: 'Open signals', value: sum((r) => r.openSignals), detail: `${sum((r) => r.highSignals)} high` },
  ]
```

and `className="grid grid-cols-2 gap-4 lg:grid-cols-4"` → `className="grid gap-4 sm:grid-cols-3"`.

- [ ] **Step 4: Write `src/components/portfolio/portfolio-view.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import type { PortfolioRow } from '@/lib/data/repository'
import { toPortfolioRow } from '@/lib/data/view-models'
import { useDecisions } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { PortfolioTotals } from './portfolio-totals'
import { ProjectsTable } from './projects-table'

/** Server rows plus the wizard project once its v1 is locked (decisions live in the browser). */
export function PortfolioView({ rows, draft, now }: { rows: PortfolioRow[]; draft: PlannerDraft | null; now: IsoDateTime }) {
  const decisions = useDecisions(draft?.brief.projectId ?? '')
  const all = useMemo(() => {
    const data = draft ? applyDecisions(draft, decisions) : null
    return data ? [...rows, toPortfolioRow(data)] : rows
  }, [rows, draft, decisions])

  return (
    <>
      <PortfolioTotals rows={all} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{`${all.length} ${all.length === 1 ? 'project' : 'projects'}`}</p>
        <ProjectsTable rows={all} now={now} />
      </div>
    </>
  )
}
```

- [ ] **Step 5: Update `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { PortfolioView } from '@/components/portfolio/portfolio-view'
import { buttonVariants } from '@/components/ui/button'
import { getNow, getRepository } from '@/lib/data'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'

export default async function PortfolioPage() {
  const repo = getRepository()
  const [rows, draft] = await Promise.all([repo.getPortfolio(), repo.getPlannerDraft(WIZARD_PROJECT_ID)])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Agentic projects, measured by verified acceptance criteria.</p>
        </div>
        <Link href="/projects/new" className={buttonVariants()}>
          New project
        </Link>
      </div>
      <PortfolioView rows={rows} draft={draft} now={getNow()} />
    </div>
  )
}
```

If importing `buttonVariants` from `@/components/ui/button` into this Server Component fails at build (because the module is a client module), add a plain-class link instead with the same look and report it.

- [ ] **Step 6: Verify**

Run: `npx vitest run src/components/portfolio && npm run typecheck && npm run lint && npm run build`
Expected: PASS; the build route table still lists `/`.

- [ ] **Step 7: Commit**

```bash
git add src/components/portfolio src/app/page.tsx
git commit -m "feat: reorder Portfolio totals, show project count and the wizard project" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Wizard step components

**Files:**
- Create: `src/components/wizard/stepper.tsx`, `describe-step.tsx`, `questions-step.tsx`, `review-step.tsx`, `task-ticket.tsx`, `locked-step.tsx`
- Test: `src/components/wizard/steps.test.tsx`

- [ ] **Step 1: Write the failing tests** — `src/components/wizard/steps.test.tsx`

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { DescribeStep } from './describe-step'
import { LockedStep } from './locked-step'
import { QuestionsStep } from './questions-step'
import { ReviewStep } from './review-step'
import { Stepper } from './stepper'

const storyIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))
const all = (decision: 'approved' | 'rejected'): ProjectDecisions => ({ stories: Object.fromEntries(storyIds.map((id) => [id, decision])), lock: null })

describe('Stepper', () => {
  it('marks the current step', () => {
    render(<Stepper current={2} />)
    expect(screen.getByText('3. Review scope')).toHaveAttribute('aria-current', 'step')
  })
})

describe('DescribeStep', () => {
  it('shows the prefilled brief and a submit button that reports drafting', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<DescribeStep brief={draft.brief} drafting={false} onSubmit={onSubmit} />)
    expect(screen.getByText('Intelligent Flow v2')).toBeInTheDocument()
    expect(screen.getByText('Prefilled for the demo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    rerender(<DescribeStep brief={draft.brief} drafting onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Planner is drafting…' })).toBeDisabled()
  })
})

describe('QuestionsStep', () => {
  it('shows each question with its prefilled answer selected', () => {
    render(<QuestionsStep questions={draft.questions} drafting={false} onSubmit={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Jira and Slack' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Jira only' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'GitHub' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Submit answers' })).toBeEnabled()
  })
})

describe('ReviewStep', () => {
  const props = { features: draft.scope.features, onDecide: vi.fn(), onApproveAll: vi.fn(), onLock: vi.fn() }

  it('lists every story and keeps Lock disabled until all are decided', () => {
    render(<ReviewStep {...props} decisions={EMPTY_DECISIONS} />)
    expect(screen.getByText('0 of 7 stories decided')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lock v1' })).toBeDisabled()
    expect(screen.getByText('Decide every story to lock v1.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reject US-4.1' }))
    expect(props.onDecide).toHaveBeenCalledWith('US-4.1', 'rejected')
    fireEvent.click(screen.getByRole('button', { name: 'Approve all' }))
    expect(props.onApproveAll).toHaveBeenCalledOnce()
  })

  it('enables Lock when every story is decided and at least one is approved', () => {
    render(<ReviewStep {...props} decisions={{ ...all('approved'), stories: { ...all('approved').stories, 'US-4.1': 'rejected' } }} />)
    expect(screen.getByText('7 of 7 stories decided')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve US-1.1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Lock v1' }))
    expect(props.onLock).toHaveBeenCalledOnce()
  })

  it('keeps Lock disabled when every story is rejected', () => {
    render(<ReviewStep {...props} decisions={all('rejected')} />)
    expect(screen.getByRole('button', { name: 'Lock v1' })).toBeDisabled()
    expect(screen.getByText('Approve at least one story to lock v1.')).toBeInTheDocument()
  })
})

describe('LockedStep', () => {
  it('shows the lock line, the generated tickets without rejected ACs, and the next actions', () => {
    const decisions = { stories: { ...all('approved').stories, 'US-4.1': 'rejected' as const }, lock: { lockedAt: '2026-10-16T09:00:00+02:00', lockedBy: 'Demo approver' } }
    const data = applyDecisions(draft, decisions)
    if (!data) throw new Error('expected data')
    const onReset = vi.fn()
    render(<LockedStep data={data} onReset={onReset} />)
    expect(screen.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Generated tasks (16)' })).toBeInTheDocument()
    expect(screen.queryByText(/AC-4\.1\.1/)).not.toBeInTheDocument()
    const t08 = screen.getByText(/^T-08 · No self-approval/).closest('[data-slot="card"]') as HTMLElement
    expect(within(t08).getByRole('button', { name: 'Copy as Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open project overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByRole('link', { name: 'Back to portfolio' })).toHaveAttribute('href', '/')
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
```

Run: `npx vitest run src/components/wizard`
Expected: FAIL (`Failed to resolve import`).

- [ ] **Step 2: Write `stepper.tsx`**

```tsx
const STEPS = ['Describe', 'Clarifying questions', 'Review scope', 'v1 locked'] as const

export function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Wizard steps" className="flex flex-wrap gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className={
            i === current
              ? 'rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground'
              : `rounded-full border px-3 py-1 ${i < current ? 'text-foreground' : 'text-muted-foreground'}`
          }
        >
          {`${i + 1}. ${label}`}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 3: Write `describe-step.tsx`**

```tsx
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlannerBrief } from '@/lib/domain/planner'

const FIELDS: { key: 'name' | 'goal' | 'users' | 'constraints' | 'tech' | 'nonGoals'; label: string }[] = [
  { key: 'name', label: 'Project name' },
  { key: 'goal', label: 'Goal' },
  { key: 'users', label: 'Users' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'tech', label: 'Tech preferences' },
  { key: 'nonGoals', label: 'Non-goals' },
]

export function DescribeStep({ brief, drafting, onSubmit }: { brief: PlannerBrief; drafting: boolean; onSubmit: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">Describe the project</h2>
        </CardTitle>
        <CardDescription>Prefilled for the demo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {FIELDS.map((f) => (
            <Fragment key={f.key}>
              <dt className="text-sm font-medium">{f.label}</dt>
              <dd className="text-sm text-muted-foreground">{brief[f.key]}</dd>
            </Fragment>
          ))}
        </dl>
        <Button onClick={onSubmit} disabled={drafting}>
          {drafting ? 'Planner is drafting…' : 'Submit to planner'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Write `questions-step.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlannerQuestion } from '@/lib/domain/planner'

export function QuestionsStep({ questions, drafting, onSubmit }: { questions: PlannerQuestion[]; drafting: boolean; onSubmit: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">The planner has a few questions</h2>
        </CardTitle>
        <CardDescription>Answers are prefilled for the demo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q) => (
          <fieldset key={q.id} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{q.question}</legend>
            {q.options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" name={q.id} value={option} checked={option === q.answer} readOnly disabled />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
        <Button onClick={onSubmit} disabled={drafting}>
          {drafting ? 'Planner is drafting…' : 'Submit answers'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

(Disabled radios still expose `checked` to Testing Library; if `toBeChecked` fails on a disabled radio in this jsdom version, drop `disabled` and keep `readOnly` + `onChange={() => {}}`, and report it.)

- [ ] **Step 5: Write `review-step.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectDecisions, StoryDecision } from '@/lib/domain/planner'
import type { Feature, UserStory } from '@/lib/domain/types'

interface ReviewStepProps {
  features: Feature[]
  decisions: ProjectDecisions
  onDecide: (storyId: string, decision: StoryDecision) => void
  onApproveAll: () => void
  onLock: () => void
}

export function ReviewStep({ features, decisions, onDecide, onApproveAll, onLock }: ReviewStepProps) {
  const stories = features.flatMap((f) => f.stories)
  const decided = stories.filter((s) => decisions.stories[s.id]).length
  const approved = stories.filter((s) => decisions.stories[s.id] === 'approved').length
  const lockHint = decided < stories.length ? 'Decide every story to lock v1.' : approved === 0 ? 'Approve at least one story to lock v1.' : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Review the generated scope</h2>
          <p className="text-sm text-muted-foreground">{`${decided} of ${stories.length} stories decided`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onApproveAll} disabled={decided === stories.length}>
            Approve all
          </Button>
          <Button onClick={onLock} disabled={lockHint !== null}>
            Lock v1
          </Button>
        </div>
      </div>
      {lockHint && <p className="text-sm text-muted-foreground">{lockHint}</p>}
      {features.map((f) => (
        <section key={f.id} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{`${f.id} · ${f.title}`}</h3>
          {f.stories.map((s) => (
            <StoryCard key={s.id} story={s} decision={decisions.stories[s.id]} onDecide={(d) => onDecide(s.id, d)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function StoryCard({ story, decision, onDecide }: { story: UserStory; decision?: StoryDecision; onDecide: (d: StoryDecision) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h4 className="font-heading m-0 text-base font-medium leading-snug">{`${story.id} ${story.text}`}</h4>
        </CardTitle>
        {decision && <Badge variant={decision === 'approved' ? 'secondary' : 'destructive'}>{decision === 'approved' ? 'Approved' : 'Rejected'}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-sm">
          {story.acs.map((a) => (
            <li key={a.id}>
              <span className="font-mono text-xs text-muted-foreground">{a.id}</span> {a.text}
              {a.humanTest && <span title="Needs a human tester"> 👤</span>}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button size="sm" variant={decision === 'approved' ? 'default' : 'outline'} aria-pressed={decision === 'approved'} aria-label={`Approve ${story.id}`} onClick={() => onDecide('approved')}>
            Approve
          </Button>
          <Button size="sm" variant={decision === 'rejected' ? 'destructive' : 'outline'} aria-pressed={decision === 'rejected'} aria-label={`Reject ${story.id}`} onClick={() => onDecide('rejected')}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Write `task-ticket.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AcceptanceCriterion, Task } from '@/lib/domain/types'
import { ticketMarkdown } from '@/lib/wizard/ticket-markdown'

export function TaskTicket({ task, acs }: { task: Task; acs: AcceptanceCriterion[] }) {
  const markdown = ticketMarkdown(task, acs)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{markdown}</pre>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied' : 'Copy as Markdown'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

Note for the test: `getByText(/^T-08 · No self-approval/)` matches the `<pre>` (its text starts with the ticket's first line).

- [ ] **Step 7: Write `locked-step.tsx`**

```tsx
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcceptanceCriterion, ProjectData } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { TaskTicket } from './task-ticket'

export function LockedStep({ data, onReset }: { data: ProjectData; onReset: () => void }) {
  const scope = currentScope(data.project)
  const acById = new Map(acsOf(scope).map((a) => [a.id, a]))
  const acsFor = (ids: string[]) => ids.map((id) => acById.get(id)).filter((a): a is AcceptanceCriterion => a !== undefined)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{`Scope ${scope.label} locked`}</h2>
          <p className="text-sm text-muted-foreground">{`Scope ${scope.label} · locked ${formatDate(scope.lockedAt)} by ${scope.approvedBy}`}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${data.project.id}`} className={buttonVariants()}>
            Open project overview
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Back to portfolio
          </Link>
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-base font-medium">{`Generated tasks (${data.tasks.length})`}</h3>
        {data.tasks.map((t) => (
          <TaskTicket key={t.id} task={t} acs={acsFor(t.acIds)} />
        ))}
      </section>
      <Button variant="link" onClick={onReset}>
        Reset demo
      </Button>
    </div>
  )
}
```

- [ ] **Step 8: Verify**

Run: `npx vitest run src/components/wizard && npm run typecheck && npm run lint`
Expected: PASS (8 tests). If a query fails because base-nova renders differently (e.g. `CardTitle` markup), fix the test's query to target the same visible behaviour and report it.

- [ ] **Step 9: Commit**

```bash
git add src/components/wizard
git commit -m "feat: add the wizard steps" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Wizard container and `/projects/new`

**Files:**
- Create: `src/components/wizard/wizard.tsx`, `src/app/projects/new/page.tsx`
- Test: `src/components/wizard/wizard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { Wizard } from './wizard'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()

describe('Wizard', () => {
  beforeEach(() => store.reset(draft.brief.projectId))

  it('walks from the brief to a locked v1 and can be reset', async () => {
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit to planner' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit answers' }))
    await screen.findByText('Review the generated scope')

    fireEvent.click(screen.getByRole('button', { name: 'Reject US-4.1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lock v1' }))

    expect(await screen.findByText('Scope v1 · locked 16 Oct by Demo approver')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Generated tasks (16)' })).toBeInTheDocument()
    expect(store.get(draft.brief.projectId).lock).toEqual({ lockedAt: NOW, lockedBy: 'Demo approver' })

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(await screen.findByRole('button', { name: 'Submit to planner' })).toBeInTheDocument()
    expect(store.get(draft.brief.projectId).lock).toBeNull()
  })

  it('opens on the locked step when v1 is already locked', () => {
    store.decideAll(draft.brief.projectId, ['US-1.1'], 'approved')
    store.lock(draft.brief.projectId, NOW, 'Demo approver')
    render(<Wizard draft={draft} now={NOW} draftingMs={0} />)
    expect(screen.getByRole('heading', { name: 'Generated tasks (2)' })).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/wizard/wizard.test.tsx`
Expected: FAIL, `Failed to resolve import "./wizard"`.

- [ ] **Step 2: Write `src/components/wizard/wizard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { getDecisionStore, useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { DescribeStep } from './describe-step'
import { LockedStep } from './locked-step'
import { QuestionsStep } from './questions-step'
import { ReviewStep } from './review-step'
import { Stepper } from './stepper'

const STEP_INDEX = { describe: 0, questions: 1, review: 2, locked: 3 } as const
type Step = keyof typeof STEP_INDEX

/** Click-through demo of the greenfield flow. Content comes from the draft; only decisions are stored. */
export function Wizard({ draft, now, draftingMs = 900 }: { draft: PlannerDraft; now: IsoDateTime; draftingMs?: number }) {
  const projectId = draft.brief.projectId
  const isClient = useIsClient()
  const decisions = useDecisions(projectId)
  const [step, setStep] = useState<Step>('describe')
  const [drafting, setDrafting] = useState(false)

  // Decisions live in the browser; render nothing until we can read them, to avoid flashing step 1.
  if (!isClient) return null

  const store = getDecisionStore()
  const data = applyDecisions(draft, decisions)
  const current: Step = data ? 'locked' : step
  const storyIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))

  // Pretend the planner (an LLM later) takes a moment.
  const draftThen = (next: Step) => {
    setDrafting(true)
    setTimeout(() => {
      setDrafting(false)
      setStep(next)
    }, draftingMs)
  }

  return (
    <div className="space-y-6">
      <Stepper current={STEP_INDEX[current]} />
      {current === 'describe' && <DescribeStep brief={draft.brief} drafting={drafting} onSubmit={() => draftThen('questions')} />}
      {current === 'questions' && <QuestionsStep questions={draft.questions} drafting={drafting} onSubmit={() => draftThen('review')} />}
      {current === 'review' && (
        <ReviewStep
          features={draft.scope.features}
          decisions={decisions}
          onDecide={(storyId, decision) => store.decideStory(projectId, storyId, decision)}
          onApproveAll={() => store.decideAll(projectId, storyIds, 'approved')}
          onLock={() => store.lock(projectId, now, draft.brief.approver)}
        />
      )}
      {current === 'locked' && data && (
        <LockedStep
          data={data}
          onReset={() => {
            store.reset(projectId)
            setStep('describe')
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/projects/new/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Wizard } from '@/components/wizard/wizard'
import { getNow, getRepository } from '@/lib/data'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'

export default async function NewProjectPage() {
  const draft = await getRepository().getPlannerDraft(WIZARD_PROJECT_ID)
  if (!draft) notFound()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Portfolio
        </Link>
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-muted-foreground">Describe the project, answer the planner’s questions, then approve the generated scope.</p>
      </div>
      <Wizard draft={draft} now={getNow()} />
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/components/wizard && npm run typecheck && npm run lint && npm run build`
Expected: PASS; the build route table lists `/projects/new` (static `new` takes precedence over `[projectId]`).

- [ ] **Step 5: Commit**

```bash
git add src/components/wizard/wizard.tsx src/components/wizard/wizard.test.tsx src/app/projects/new
git commit -m "feat: add the New project wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Intelligent Flow v2 project pages

**Files:**
- Create: `src/components/project/project-shell.tsx`, `src/components/project/overview-content.tsx`, `src/components/project/draft-project-layout.tsx`, `src/components/project/draft-overview.tsx`
- Test: `src/components/project/draft-project.test.tsx`
- Modify: `"src/app/projects/[projectId]/layout.tsx"`, `"src/app/projects/[projectId]/page.tsx"`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { DraftOverview } from './draft-overview'
import { DraftProjectLayout } from './draft-project-layout'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const P = draft.brief.projectId

describe('Intelligent Flow v2 project pages', () => {
  beforeEach(() => store.reset(P))

  it('says the scope is not locked yet and links to the wizard', () => {
    render(<DraftProjectLayout draft={draft}><DraftOverview draft={draft} now={NOW} /></DraftProjectLayout>)
    expect(screen.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the wizard' })).toHaveAttribute('href', '/projects/new')
  })

  it('shows the header, sidebar and overview once v1 is locked', () => {
    store.decideAll(P, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(P, NOW, 'Demo approver')
    render(<DraftProjectLayout draft={draft}><DraftOverview draft={draft} now={NOW} /></DraftProjectLayout>)
    expect(screen.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 16 Oct by Demo approver/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('0 of 28 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('Scope v1 locked by Demo approver')).toBeInTheDocument()
    expect(screen.getByText('No open signals.')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/project/draft-project.test.tsx`
Expected: FAIL (`Failed to resolve import`).

- [ ] **Step 2: Extract `project-shell.tsx`** (shared by the server layout and the draft layout)

```tsx
import type { ProjectHeaderData } from '@/lib/data/repository'
import { ProjectHeader } from './project-header'
import { ProjectSidebar } from './project-sidebar'

export function ProjectShell({ header, children }: { header: ProjectHeaderData; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ProjectHeader header={header} />
      <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <ProjectSidebar projectId={header.id} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Extract `overview-content.tsx`** (shared by the server page and the draft page)

```tsx
import type { ProjectOverview } from '@/lib/data/repository'
import type { IsoDateTime } from '@/lib/domain/types'
import { AcStateBar } from './ac-state-bar'
import { ActivityFeed } from './activity-feed'
import { KpiCards } from './kpi-cards'
import { SignalsList } from './signals-list'

export function OverviewContent({ overview, now }: { overview: ProjectOverview; now: IsoDateTime }) {
  return (
    <div className="space-y-6">
      <KpiCards rollup={overview.rollup} now={now} />
      <AcStateBar counts={overview.rollup.counts} total={overview.rollup.total} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SignalsList signals={overview.topSignals} now={now} />
        <ActivityFeed events={overview.activity} now={now} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `draft-project-layout.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { toProjectHeader } from '@/lib/data/view-models'
import { useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { ProjectShell } from './project-shell'

/** Project shell for the wizard project; its scope only exists once the browser's decisions lock v1. */
export function DraftProjectLayout({ draft, children }: { draft: PlannerDraft; children: React.ReactNode }) {
  const isClient = useIsClient()
  const decisions = useDecisions(draft.brief.projectId)
  if (!isClient) return null

  const data = applyDecisions(draft, decisions)
  if (!data) {
    return (
      <div className="space-y-2 py-16 text-center">
        <h1 className="text-xl font-semibold">{draft.brief.name}</h1>
        <p className="text-muted-foreground">{`${draft.brief.name}’s scope isn’t locked yet.`}</p>
        <Link href="/projects/new" className="underline">
          Open the wizard
        </Link>
      </div>
    )
  }
  return <ProjectShell header={toProjectHeader(data)}>{children}</ProjectShell>
}
```

- [ ] **Step 5: Write `draft-overview.tsx`**

```tsx
'use client'

import { toProjectOverview } from '@/lib/data/view-models'
import { useDecisions } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { OverviewContent } from './overview-content'

export function DraftOverview({ draft, now }: { draft: PlannerDraft; now: IsoDateTime }) {
  const decisions = useDecisions(draft.brief.projectId)
  const data = applyDecisions(draft, decisions)
  return data ? <OverviewContent overview={toProjectOverview(data)} now={now} /> : null
}
```

- [ ] **Step 6: Use them in the route**

Replace `"src/app/projects/[projectId]/layout.tsx"` with:

```tsx
import { notFound } from 'next/navigation'
import { DraftProjectLayout } from '@/components/project/draft-project-layout'
import { ProjectShell } from '@/components/project/project-shell'
import { getRepository } from '@/lib/data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repo = getRepository()
  const header = await repo.getProjectHeader(projectId)
  if (header) return <ProjectShell header={header}>{children}</ProjectShell>

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return <DraftProjectLayout draft={draft}>{children}</DraftProjectLayout>
}
```

Replace `"src/app/projects/[projectId]/page.tsx"` with:

```tsx
import { notFound } from 'next/navigation'
import { DraftOverview } from '@/components/project/draft-overview'
import { OverviewContent } from '@/components/project/overview-content'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repo = getRepository()
  const now = getNow()

  const overview = await repo.getProjectOverview(projectId)
  if (overview) return <OverviewContent overview={overview} now={now} />

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return <DraftOverview draft={draft} now={now} />
}
```

- [ ] **Step 7: Verify**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: all pass (existing header/overview component tests unchanged).

- [ ] **Step 8: Commit**

```bash
git add src/components/project "src/app/projects/[projectId]/layout.tsx" "src/app/projects/[projectId]/page.tsx"
git commit -m "feat: show Intelligent Flow v2 once its scope is locked" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: End-to-end tests

**Files:**
- Create: `e2e/wizard.spec.ts`
- Modify: `e2e/portfolio.spec.ts`

- [ ] **Step 1: Update `e2e/portfolio.spec.ts`** — after the heading assertion, add:

```ts
  await expect(page.getByText('3 projects')).toBeVisible()
  await expect(page.getByRole('link', { name: 'New project' })).toBeVisible()
```

- [ ] **Step 2: Write `e2e/wizard.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test('the wizard creates Intelligent Flow v2 and the demo can be reset', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('3 projects')).toBeVisible()

  await page.getByRole('link', { name: 'New project' }).click()
  await expect(page).toHaveURL(/\/projects\/new$/)
  await page.getByRole('button', { name: 'Submit to planner' }).click()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByText('0 of 7 stories decided')).toBeVisible()
  await page.getByRole('button', { name: 'Approve all' }).click()
  await page.getByRole('button', { name: 'Lock v1' }).click()

  await expect(page.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Generated tasks (17)' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to portfolio' }).click()
  await expect(page.getByText('4 projects')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Intelligent Flow v2' })
  await expect(row.getByText('Completion 0% · Delivery 0%')).toBeVisible()

  await row.getByRole('link', { name: 'Intelligent Flow v2' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeVisible()
  await expect(page.getByText('0 of 28 ACs verified')).toBeVisible()
  await expect(page.getByText('Scope v1 locked by Demo approver')).toBeVisible()

  await page.goto('/projects/new')
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('button', { name: 'Submit to planner' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('3 projects')).toBeVisible()
})

test('Intelligent Flow v2 asks for the wizard before it is locked', async ({ page }) => {
  await page.goto('/projects/intelligent-flow-v2')
  await expect(page.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open the wizard' })).toBeVisible()
})
```

(Each Playwright test runs in a fresh browser context, so localStorage starts empty.)

- [ ] **Step 3: Run**

Run: `npm run test:e2e`
Expected: `5 passed`. If a test fails, decide with evidence whether the app or the test is wrong; fix the test only when its locator doesn't match correct visible behaviour, and report app bugs.

- [ ] **Step 4: Commit**

```bash
git add e2e/wizard.spec.ts e2e/portfolio.spec.ts
git commit -m "test: add end-to-end test for the wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Rename "signals" to "warnings"

Spec §5a. A mechanical rename across code, UI text and tests, done after the wizard work so it covers the new code too. No behaviour changes.

**Files:** everything `grep -rli "signal" src e2e` lists, plus `git mv src/components/project/signals-list.tsx src/components/project/warnings-list.tsx` and its test.

- [ ] **Step 1: Rename**, using this mapping exactly:

| Before | After |
|---|---|
| `Signal`, `SignalType` (types.ts) | `Warning`, `WarningType` |
| `ProjectData.signals` | `ProjectData.warnings` |
| `PortfolioRow.openSignals`, `highSignals` | `openWarnings`, `highWarnings` |
| `ProjectOverview.topSignals` | `topWarnings` |
| `SignalsList` in `signals-list.tsx` (+ `signals-list.test.tsx`) | `WarningsList` in `warnings-list.tsx` (+ `warnings-list.test.tsx`) |
| Mock ids `'SIG-1'`, `'SIG-2'`, `'SIG-3'` | `'WRN-1'`, `'WRN-2'`, `'WRN-3'` |
| UI "Open signals" / "Top signals" / "No open signals." | "Open warnings" / "Top warnings" / "No open warnings." |
| Local names (`signal`, `signals`, `sig`, `SEVERITY_RANK` comments), test titles ("has red-main, regression and ticked-but-red signals" …) | the `warning(s)` equivalents |

Keep the `type` values (`'red_main'`, `'regression'`, …) and `'pending_user_testing'` unchanged.

- [ ] **Step 2: Check nothing is left**

Run: `grep -rni "signal" src e2e`
Expected: no output.

- [ ] **Step 3: Verify**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run test:e2e`
Expected: all pass with the same test counts as before the rename.

- [ ] **Step 4: Commit**

```bash
git add src e2e   # stages edits, renames and deletions under src/ and e2e/ only
git status --short   # check: only src/ and e2e/ paths, no .env
git commit -m "refactor: rename signals to warnings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Docs

**Files:**
- Modify: `ARCHITECTURE.md`, `README.md`, `docs/superpowers/specs/2026-10-16-poc-foundation-design.md`

- [ ] **Step 1: ARCHITECTURE.md**
- Add to the tree: `src/app/projects/new/page.tsx` (wizard), `components/wizard/`, `lib/decisions/` ("decision store: localStorage now, DB later"), `lib/mock/planner/` ("planner drafts as JSON"), `lib/wizard/`, `lib/data/view-models.ts` ("pure mappers used by server and client").
- Add a "Decisions" paragraph under the rules: content (projects, planner drafts) comes from the repository on the server; human decisions (story approvals, v1 lock) are only read and written through `DecisionStore` (`lib/decisions`), currently localStorage; client components combine draft + decisions with `applyDecisions` and the shared view-model helpers. Client code imports `@/lib/data/view-models` and `@/lib/data/repository` types, never `@/lib/data` (which pulls in the mock data).
- Update the client-components rule: our client components are the decision-aware ones (`PortfolioView`, `Wizard`, `DraftProjectLayout`, `DraftOverview`, `TaskTicket`); everything else is a Server Component. Remove any mention of charts.

- [ ] **Step 2: README.md §5** — in the Screens table:
- Project overview row: replace "burn‑up by AC" with "AC state breakdown".
- New project wizard row: append "(POC: a click-through demo that creates *Intelligent Flow v2* from prefilled planner JSON; only approvals and the v1 lock are stored, in localStorage)".
Keep README's tone and the non-breaking hyphens it uses.

- [ ] **Step 2b: README warnings rename** (spec §5a) — rename the concept "signal(s)" to "warning(s)" in: §2 concept table row, the §3.1 flowchart label (`Progress, signals<br/>and change requests`), §3.5 heading, intro sentence and table header, the §4 diagram node (`SIG[Signals engine…]` → `WRN[Warnings engine…]`, and its edge `API --> SIG`) and the "Signals engine" component bullet, §5 Portfolio and Project overview rows, the Project B demo line ("red‑main warning"), and roadmap item 7 ("Warnings v2"). Do **not** change §1 "real delivery signals (PRs, commits, CI checks)" or §3.2 "a secondary signal". Also change "signals" → "warnings" in ARCHITECTURE.md's "Mocks hold raw facts only" line. Afterwards `grep -ni "signal" README.md` should list only lines 25 and 103's plain-English uses.

- [ ] **Step 3: Foundation spec** — in `2026-10-16-poc-foundation-design.md`, add at the top under **Status**: `**Update 2026-10-16:** the burn-up (§4.3, §6.2) was removed; see 2026-10-16-new-project-wizard-design.md §5.` Don't rewrite the old sections.

- [ ] **Step 4: Commit**

```bash
git add ARCHITECTURE.md README.md docs/superpowers/specs/2026-10-16-poc-foundation-design.md
git commit -m "docs: document the wizard, decision store and burn-up removal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Final verification

Use `superpowers:verification-before-completion`.

- [ ] **Step 1: Run every check**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
```

Expected: every command exits 0. Record the counts.

- [ ] **Step 2: Look at the screens** (production build, `npm run start -- -p 3200`, Playwright browser tools, 1440×900 and 1280×800, light and dark)
1. `/`: "3 projects", cards in the order Pending approvals · Pending user testing · Open warnings, a New project button.
2. `/projects/new`: walk all four steps; the drafting state shows briefly; Reject one story, Approve all, Lock v1; tickets render and Copy as Markdown works.
3. `/`: "4 projects", Intelligent Flow v2 at 0% / 0%.
4. `/projects/intelligent-flow-v2`: header, sidebar, KPIs 0%, state bar all "Not started", activity "Scope v1 locked by Demo approver".
5. Reset demo; `/` shows 3 projects again; `/projects/intelligent-flow-v2` shows the "isn't locked yet" message.
6. `/projects/customer-portal`: no burn-up card; everything else unchanged.

Save screenshots under `.playwright-mcp/` (gitignored). Stop the server afterwards.

- [ ] **Step 3: Check nothing secret or stray is tracked**

```bash
git ls-files | grep -E '^\.env' ; echo "exit: $?"
git status --short
```

Expected: `exit: 1`; only untracked files you know about (e.g. `RUNNING.md`, which is not ours).
