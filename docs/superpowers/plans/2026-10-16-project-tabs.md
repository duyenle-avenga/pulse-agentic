# Project tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seven "soon" project tabs (User testing, Scope, Tasks, Evidence, Approvals, Changelog, Metrics) with working screens. Human test results and scope change decisions are stored in the browser and show up on every screen.

**Architecture:** The server loads raw `ProjectData` (or the wizard's planner draft) and hands it to a client `ProjectDataProvider`. The provider merges the localStorage decisions with pure `applyProjectDecisions` (human tests, SCR decisions → new scope versions, derived warnings) and exposes `{ data, acStates, now }` via `useProject()`. Every tab, the project header and the Portfolio read merged data, so their numbers always agree.

**Tech Stack:** Next.js 16 App Router (TypeScript), React 19, Tailwind CSS 4, shadcn/ui (base-nova, `@base-ui/react`), Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-project-tabs-design.md`

---

## Conventions for every task

- Code style: single quotes, no semicolons, 2-space indent, `@/` imports. Match the surrounding file.
- Run one test file with `npx vitest run <path>`. Run everything with `npm test`.
- Before each commit: `npm run typecheck` and `npm run lint` must pass.
- Commit messages follow the repo (`feat:`, `test:`, `refactor:`, `docs:`) and end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- Don't stage `RUNNING.md` (untracked, not part of this work). Never touch `.env.local`.
- UI text uses typographic apostrophes (`’`), as the existing code does.
- The demo clock is `DEMO_NOW = '2026-10-16T09:00:00+02:00'`; component tests use that literal as `NOW`.

## File map

**Domain and decisions**
- Modify `src/lib/domain/types.ts`: `ScopeProposal`, `ScopeVersion.changedBy`, `ScopeChangeRequest.proposal` / `decisionReason`.
- Modify `src/lib/domain/planner.ts`: `ScrDecision`, optional `humanTests` / `scrs` on `ProjectDecisions`.
- Modify `src/lib/decisions/store.ts`, `local-storage-store.ts`, `use-decisions.ts` (+ test): `getAll`, `recordHumanTest`, `decideScr`, `useAllDecisions`.

**Pure logic (`src/lib/progress/`, each with a `.test.ts`)**
- `scopeChange.ts`: `applyProposal`, `nextVersionLabel`.
- `diffScopes.ts`: `diffScopes`, `diffSummary`.
- `deriveWarnings.ts`: computed `pending_user_testing` and `pending_decision` warnings.
- `applyProjectDecisions.ts`: merges decisions into `ProjectData`.
- `changelog.ts`: changelog entries.
- `taskStatus.ts`: `taskStatus`, `acProgress`, `TASK_STATUSES`.
- `scrImpact.ts`: impact analysis of a pending SCR.
- `evidence.ts`: `evidenceByAc`.
- `userTesting.ts`: `userTestingQueue`.

**Mock data**
- Modify `src/lib/mock/project-a.ts`, `project-b.ts`, `project-c.ts` and their tests, `integrity.test.ts`.

**Data layer**
- Modify `src/lib/data/repository.ts`, `mock-repository.ts` (+ test), `view-models.test.ts`.

**UI**
- Create `src/components/project/project-data-provider.tsx` (+ test), `overview-view.tsx`, `screen-heading.tsx`, `ac-state-badge.tsx`, `scope-diff-list.tsx` (+ test), `test-utils.tsx`.
- Create `src/components/human-test-mark.tsx`.
- Create one folder per screen under `src/components/project/`: `user-testing/`, `approvals/`, `scope/`, `tasks/`, `evidence/`, `changelog/`, `metrics/`.
- Modify `src/components/project/project-sidebar.tsx`, `project-header.test.tsx`, `src/components/labels.ts`, `src/components/portfolio/portfolio-view.tsx` (+ test).
- Delete `src/components/project/draft-project-layout.tsx`, `draft-overview.tsx`, `draft-project.test.tsx`.
- Add shadcn `input`, `textarea`, `label` in `src/components/ui/`.

**Routes**
- Modify `src/app/page.tsx`, `src/app/projects/[projectId]/layout.tsx`, `page.tsx`.
- Create `src/app/projects/[projectId]/{user-testing,scope,tasks,evidence,approvals,changelog,metrics}/page.tsx`.

**E2E and docs**
- Create `e2e/project-tabs.spec.ts`; modify `e2e/overview.spec.ts`.
- Modify `ARCHITECTURE.md`.

---

### Task 1: Domain types for proposals and new decisions

**Files:**
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/domain/planner.ts`

- [ ] **Step 1: Add `changedBy` to `ScopeVersion`**

In `src/lib/domain/types.ts`, replace the `ScopeVersion` interface with:

```ts
export interface ScopeVersion {
  label: string
  lockedAt: IsoDateTime
  approvedBy: string
  /** The SCR that created this version; absent for the initial version. */
  changedBy?: string
  features: Feature[]
}
```

- [ ] **Step 2: Add `ScopeProposal` and the new SCR fields**

In the same file, directly above `export type ScrSource`, add:

```ts
/** What an SCR would change in the current scope, and the tasks it would add. */
export interface ScopeProposal {
  /** featureTitle is set only when the story goes into a new feature with id featureId. */
  addStories: { featureId: string; featureTitle?: string; story: UserStory }[]
  addAcs: { storyId: string; ac: AcceptanceCriterion }[]
  changeAcs: { acId: string; text: string }[]
  removeAcIds: string[]
  tasks: Omit<Task, 'projectId'>[]
}
```

Then replace the `ScopeChangeRequest` interface with:

```ts
export interface ScopeChangeRequest {
  id: string
  projectId: string
  title: string
  source: ScrSource
  prNumber?: number
  status: ScrStatus
  raisedAt: IsoDateTime
  decidedAt?: IsoDateTime
  decidedBy?: string
  /** Why it was raised. */
  rationale?: string
  /** Why it was approved or rejected. */
  decisionReason?: string
  proposal?: ScopeProposal
}
```

- [ ] **Step 3: Add `ScrDecision` and the optional decision fields**

In `src/lib/domain/planner.ts`, change the first import line to:

```ts
import type { BoardKind, Feature, HumanTestResult, IsoDateTime, Task } from './types'
```

Replace the `ProjectDecisions` interface with:

```ts
/** A human's decision about a scope change request, made in the demo. */
export interface ScrDecision {
  status: 'approved' | 'rejected'
  decidedAt: IsoDateTime
  decidedBy: string
  reason: string
}

/** Human decisions about a project. The only thing stored in localStorage. */
export interface ProjectDecisions {
  stories: Record<string, StoryDecision>
  lock: { lockedAt: IsoDateTime; lockedBy: string } | null
  /** Human test results recorded in the demo, oldest first. Absent until the first one. */
  humanTests?: HumanTestResult[]
  /** Scope change decisions made in the demo, by SCR id. Absent until the first one. */
  scrs?: Record<string, ScrDecision>
}
```

`EMPTY_DECISIONS` stays as it is.

- [ ] **Step 4: Check types and tests still pass**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests PASS (only optional fields were added).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/types.ts src/lib/domain/planner.ts
git commit -m "feat: add scope proposal and decision types for the project tabs"
```

---

### Task 2: Decision store records human tests and SCR decisions

**Files:**
- Modify: `src/lib/decisions/store.ts`
- Modify: `src/lib/decisions/local-storage-store.ts`
- Modify: `src/lib/decisions/use-decisions.ts`
- Test: `src/lib/decisions/local-storage-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('LocalStorageDecisionStore', …)` block of `src/lib/decisions/local-storage-store.test.ts` (before its closing `})`):

```ts
  const result = { acId: 'AC-1', result: 'pass' as const, environment: 'staging', tester: 'Ana Silva', testedAt: AT }
  const approve = { status: 'approved' as const, decidedAt: AT, decidedBy: 'Maya Patel', reason: 'Accountants need it' }

  it('records human test results in order and persists them', () => {
    const store = make()
    const failed = { ...result, acId: 'AC-2', result: 'fail' as const, notes: 'Button hidden on small screens' }
    store.recordHumanTest(P, result)
    store.recordHumanTest(P, failed)
    expect(store.get(P).humanTests).toEqual([result, failed])
    expect(make().get(P).humanTests).toEqual([result, failed])
  })

  it('decides an SCR only once', () => {
    const store = make()
    store.decideScr(P, 'SCR-1', approve)
    store.decideScr(P, 'SCR-1', { ...approve, status: 'rejected' })
    expect(store.get(P).scrs).toEqual({ 'SCR-1': approve })
    expect(make().get(P).scrs).toEqual({ 'SCR-1': approve })
  })

  it('loads decisions saved before human tests and SCRs existed', () => {
    storage = fakeStorage({ [DECISIONS_KEY]: JSON.stringify({ [P]: { stories: { 'US-1.1': 'approved' }, lock: null } }) })
    expect(make().get(P)).toEqual({ stories: { 'US-1.1': 'approved' }, lock: null })
  })

  it('drops malformed human tests and SCR decisions', () => {
    storage = fakeStorage({
      [DECISIONS_KEY]: JSON.stringify({
        [P]: {
          stories: {},
          lock: null,
          humanTests: [{ ...result, result: 'maybe' }, { ...result, acId: 'AC-2' }, 'nope'],
          scrs: { 'SCR-1': { status: 'approved', decidedAt: AT, decidedBy: 'Maya Patel' }, 'SCR-2': { ...approve, status: 'rejected' } },
        },
      }),
    })
    const d = make().get(P)
    expect(d.humanTests?.map((t) => t.acId)).toEqual(['AC-2'])
    expect(Object.keys(d.scrs ?? {})).toEqual(['SCR-2'])
  })

  it('reset clears human tests and SCR decisions too', () => {
    const store = make()
    store.recordHumanTest(P, result)
    store.decideScr(P, 'SCR-1', approve)
    store.reset(P)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('getAll returns every project and stays the same object until something changes', () => {
    const store = make()
    store.decideScr('expense-tracker', 'SCR-1', approve)
    store.recordHumanTest('intelligent-flow', result)
    const all = store.getAll()
    expect(Object.keys(all).sort()).toEqual(['expense-tracker', 'intelligent-flow'])
    expect(store.getAll()).toBe(all)
    store.recordHumanTest('intelligent-flow', { ...result, acId: 'AC-2' })
    expect(store.getAll()).not.toBe(all)
  })
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/decisions/local-storage-store.test.ts`
Expected: FAIL. `store.recordHumanTest is not a function` (and type errors on `decideScr` / `getAll`).

- [ ] **Step 3: Extend the `DecisionStore` interface**

Replace `src/lib/decisions/store.ts` with:

```ts
import type { ProjectDecisions, ScrDecision, StoryDecision } from '@/lib/domain/planner'
import type { HumanTestResult, IsoDateTime } from '@/lib/domain/types'

/** Where human decisions live. localStorage in the POC; a DB-backed version replaces it later. */
export interface DecisionStore {
  /** Empty decisions if none. Returns the same object until something changes. */
  get(projectId: string): ProjectDecisions
  /** Every project's decisions, by project id. Returns the same object until something changes. */
  getAll(): Readonly<Record<string, ProjectDecisions>>
  decideStory(projectId: string, storyId: string, decision: StoryDecision): void
  /** Applies the decision only to stories that are still undecided. */
  decideAll(projectId: string, storyIds: string[], decision: StoryDecision): void
  /** Doesn't check the decisions; the caller enforces the lock rule (see lockHint). */
  lock(projectId: string, lockedAt: IsoDateTime, lockedBy: string): void
  /** Appends a human test result recorded on the User testing screen. */
  recordHumanTest(projectId: string, result: HumanTestResult): void
  /** Records an approval or rejection. Ignored if this SCR already has a decision. */
  decideScr(projectId: string, scrId: string, decision: ScrDecision): void
  reset(projectId: string): void
  subscribe(listener: () => void): () => void
}
```

- [ ] **Step 4: Implement it in the localStorage store**

In `src/lib/decisions/local-storage-store.ts`:

Change the first import to:

```ts
import { EMPTY_DECISIONS, type ProjectDecisions, type ScrDecision, type StoryDecision } from '@/lib/domain/planner'
import type { HumanTestResult } from '@/lib/domain/types'
```

Below `const isDecision = …`, add:

```ts
const isString = (v: unknown): v is string => typeof v === 'string'

function normalizeHumanTest(value: unknown): HumanTestResult | null {
  if (!isRecord(value)) return null
  const { acId, result, environment, tester, testedAt, notes } = value
  if (!isString(acId) || (result !== 'pass' && result !== 'fail') || !isString(environment) || !isString(tester) || !isString(testedAt)) {
    return null
  }
  return { acId, result, environment, tester, testedAt, ...(isString(notes) ? { notes } : {}) }
}

function normalizeScrDecision(value: unknown): ScrDecision | null {
  if (!isRecord(value)) return null
  const { status, decidedAt, decidedBy, reason } = value
  if ((status !== 'approved' && status !== 'rejected') || !isString(decidedAt) || !isString(decidedBy) || !isString(reason)) return null
  return { status, decidedAt, decidedBy, reason }
}
```

In `normalize`, replace the line `out[id] = { stories, lock: normalizeLock(entry.lock) }` with:

```ts
    const humanTests = Array.isArray(entry.humanTests)
      ? entry.humanTests.map(normalizeHumanTest).filter((t): t is HumanTestResult => t !== null)
      : []
    const scrs: Record<string, ScrDecision> = {}
    if (isRecord(entry.scrs)) {
      for (const [scrId, decision] of Object.entries(entry.scrs)) {
        const normalized = normalizeScrDecision(decision)
        if (normalized) scrs[scrId] = normalized
      }
    }
    out[id] = {
      stories,
      lock: normalizeLock(entry.lock),
      // Only present when used, so wizard-only decisions keep their original shape.
      ...(humanTests.length > 0 ? { humanTests } : {}),
      ...(Object.keys(scrs).length > 0 ? { scrs } : {}),
    }
```

In the returned object, add `getAll` right after `get`, and `recordHumanTest` / `decideScr` right after `lock`:

```ts
    getAll: () => load(),
```

```ts
    recordHumanTest: (projectId, result) =>
      update(projectId, (d) => ({ ...d, humanTests: [...(d.humanTests ?? []), result] })),

    decideScr: (projectId, scrId, decision) =>
      update(projectId, (d) => (d.scrs?.[scrId] ? d : { ...d, scrs: { ...d.scrs, [scrId]: decision } })),
```

- [ ] **Step 5: Add the `useAllDecisions` hook**

In `src/lib/decisions/use-decisions.ts`, add below `useDecisions`:

```ts
const NO_DECISIONS: Readonly<Record<string, ProjectDecisions>> = Object.freeze({})

/** Every project's decisions. The server snapshot is empty, like useDecisions. */
export function useAllDecisions(): Readonly<Record<string, ProjectDecisions>> {
  return useSyncExternalStore(store.subscribe, store.getAll, () => NO_DECISIONS)
}
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/decisions/local-storage-store.test.ts`
Expected: PASS (old and new tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/decisions
git commit -m "feat: store human test results and scope change decisions"
```

---

### Task 3: Apply a scope proposal and name the next version

**Files:**
- Create: `src/lib/progress/scopeChange.ts`
- Test: `src/lib/progress/scopeChange.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/scopeChange.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Feature, ScopeProposal } from '@/lib/domain/types'
import { ac, feature, story } from '@/lib/mock/builders'
import { applyProposal, nextVersionLabel } from './scopeChange'

const base: Feature[] = [
  feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login works'), ac('AC-2', 'Looks right on a phone', true)])]),
]
const empty: ScopeProposal = { addStories: [], addAcs: [], changeAcs: [], removeAcIds: [], tasks: [] }

describe('applyProposal', () => {
  it('adds a story to an existing feature', () => {
    const next = applyProposal(base, { ...empty, addStories: [{ featureId: 'F1', story: story('US-1.2', 'Sign out', [ac('AC-3', 'Ends the session')]) }] })
    expect(next).toHaveLength(1)
    expect(next[0].stories.map((s) => s.id)).toEqual(['US-1.1', 'US-1.2'])
  })

  it('adds a story in a new feature at the end, titled from featureTitle', () => {
    const next = applyProposal(base, { ...empty, addStories: [{ featureId: 'F5', featureTitle: 'Export', story: story('US-5.1', 'Export', []) }] })
    expect(next.map((f) => [f.id, f.title])).toEqual([['F1', 'Accounts'], ['F5', 'Export']])
  })

  it('adds ACs to an existing story', () => {
    const next = applyProposal(base, { ...empty, addAcs: [{ storyId: 'US-1.1', ac: ac('AC-3', 'Locks after 5 tries') }] })
    expect(next[0].stories[0].acs.map((a) => a.id)).toEqual(['AC-1', 'AC-2', 'AC-3'])
  })

  it('changes AC text and keeps the 👤 flag', () => {
    const next = applyProposal(base, { ...empty, changeAcs: [{ acId: 'AC-2', text: 'Looks right on any phone' }] })
    expect(next[0].stories[0].acs[1]).toEqual({ id: 'AC-2', text: 'Looks right on any phone', humanTest: true })
  })

  it('removes ACs', () => {
    const next = applyProposal(base, { ...empty, removeAcIds: ['AC-1'] })
    expect(next[0].stories[0].acs.map((a) => a.id)).toEqual(['AC-2'])
  })

  it('does not change its input', () => {
    const before = JSON.stringify(base)
    applyProposal(base, { ...empty, addAcs: [{ storyId: 'US-1.1', ac: ac('AC-3', 'x') }], removeAcIds: ['AC-1'] })
    expect(JSON.stringify(base)).toBe(before)
  })
})

describe('nextVersionLabel', () => {
  it('raises the minor version', () => {
    expect(nextVersionLabel('v1')).toBe('v1.1')
    expect(nextVersionLabel('v1.1')).toBe('v1.2')
    expect(nextVersionLabel('v2')).toBe('v2.1')
  })

  it('rejects labels it does not understand', () => {
    expect(() => nextVersionLabel('beta')).toThrow('Unexpected scope version label "beta"')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/scopeChange.test.ts`
Expected: FAIL. Cannot find module `./scopeChange`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/scopeChange.ts`:

```ts
import type { Feature, ScopeProposal } from '@/lib/domain/types'

/** The features after an SCR's proposal is applied. Pure: the input is not changed. */
export function applyProposal(features: Feature[], proposal: ScopeProposal): Feature[] {
  const removed = new Set(proposal.removeAcIds)
  const changed = new Map(proposal.changeAcs.map((c) => [c.acId, c.text]))

  let next: Feature[] = features.map((f) => ({
    ...f,
    stories: f.stories.map((s) => ({
      ...s,
      acs: [
        ...s.acs.filter((a) => !removed.has(a.id)).map((a) => {
          const text = changed.get(a.id)
          return text === undefined ? a : { ...a, text }
        }),
        ...proposal.addAcs.filter((x) => x.storyId === s.id).map((x) => x.ac),
      ],
    })),
  }))

  for (const { featureId, featureTitle, story } of proposal.addStories) {
    next = next.some((f) => f.id === featureId)
      ? next.map((f) => (f.id === featureId ? { ...f, stories: [...f.stories, story] } : f))
      : [...next, { id: featureId, title: featureTitle ?? featureId, stories: [story] }]
  }
  return next
}

/** v1 → v1.1, v1.1 → v1.2. Approved scope changes are minor versions. */
export function nextVersionLabel(label: string): string {
  const match = /^v(\d+)(?:\.(\d+))?$/.exec(label)
  if (!match) throw new Error(`Unexpected scope version label "${label}"`)
  return `v${match[1]}.${Number(match[2] ?? 0) + 1}`
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/scopeChange.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/scopeChange.ts src/lib/progress/scopeChange.test.ts
git commit -m "feat: apply scope proposals and name the next version"
```

---

### Task 4: Diff two scope versions

**Files:**
- Create: `src/lib/progress/diffScopes.ts`
- Test: `src/lib/progress/diffScopes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/diffScopes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ac, feature, story } from '@/lib/mock/builders'
import { customerPortal } from '@/lib/mock/project-b'
import { diffScopes, diffSummary } from './diffScopes'

const from = { features: [feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login works'), ac('AC-2', 'Wrong password fails')])])] }

describe('diffScopes', () => {
  it('is empty for identical scopes', () => {
    expect(diffScopes(from, from)).toEqual([])
  })

  it('lists added, changed and removed items by level, features first', () => {
    const to = {
      features: [
        feature('F1', 'Sign-in', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login lands on the dashboard'), ac('AC-3', 'Looks right on a phone', true)])]),
        feature('F2', 'Export', [story('US-2.1', 'Export a month', [ac('AC-4', 'Downloads a CSV')])]),
      ],
    }
    expect(diffScopes(from, to)).toEqual([
      { kind: 'changed', level: 'feature', id: 'F1', text: 'Sign-in', before: 'Accounts' },
      { kind: 'added', level: 'feature', id: 'F2', text: 'Export' },
      { kind: 'added', level: 'story', id: 'US-2.1', text: 'Export a month' },
      { kind: 'changed', level: 'ac', id: 'AC-1', text: 'Valid login lands on the dashboard', before: 'Valid login works' },
      { kind: 'added', level: 'ac', id: 'AC-3', text: 'Looks right on a phone 👤' },
      { kind: 'added', level: 'ac', id: 'AC-4', text: 'Downloads a CSV' },
      { kind: 'removed', level: 'ac', id: 'AC-2', text: 'Wrong password fails' },
    ])
  })

  it('shows project B’s v1 → v1.1 as two added ACs', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    expect(diffScopes(v1, v11)).toEqual([
      { kind: 'added', level: 'ac', id: 'AC-3.1.5', text: 'An invoice can be downloaded as a PDF' },
      { kind: 'added', level: 'ac', id: 'AC-3.1.6', text: 'The PDF matches the invoice shown on screen 👤' },
    ])
  })
})

describe('diffSummary', () => {
  it('counts additions, changes and removals', () => {
    const to = {
      features: [
        feature('F1', 'Accounts', [story('US-1.1', 'Sign in', [ac('AC-1', 'Valid login lands on the dashboard')])]),
        feature('F5', 'Export', [story('US-5.1', 'Export', [ac('AC-5', 'a'), ac('AC-6', 'b'), ac('AC-7', 'c')])]),
      ],
    }
    expect(diffSummary(diffScopes(from, to))).toBe('+1 feature, +1 story, +3 ACs, 1 AC changed, −1 AC')
  })

  it('says when nothing changed', () => {
    expect(diffSummary([])).toBe('No changes')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/diffScopes.test.ts`
Expected: FAIL. Cannot find module `./diffScopes`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/diffScopes.ts`:

```ts
import type { Feature } from '@/lib/domain/types'

export type DiffKind = 'added' | 'changed' | 'removed'
export type DiffLevel = 'feature' | 'story' | 'ac'

export interface ScopeDiffEntry {
  kind: DiffKind
  level: DiffLevel
  id: string
  /** Feature title, story text, or AC text (with 👤 for human-test ACs). For removed items, the old text. */
  text: string
  /** Only for changed items. */
  before?: string
}

type Scope = { features: Feature[] }

const LEVELS: readonly DiffLevel[] = ['feature', 'story', 'ac']

function index({ features }: Scope): Record<DiffLevel, Map<string, string>> {
  const out: Record<DiffLevel, Map<string, string>> = { feature: new Map(), story: new Map(), ac: new Map() }
  for (const f of features) {
    out.feature.set(f.id, f.title)
    for (const s of f.stories) {
      out.story.set(s.id, s.text)
      for (const a of s.acs) out.ac.set(a.id, a.humanTest ? `${a.text} 👤` : a.text)
    }
  }
  return out
}

/** What changed from one scope to another, by id. Order: features, stories, ACs; added and changed in `to` order, then removed. */
export function diffScopes(from: Scope, to: Scope): ScopeDiffEntry[] {
  const a = index(from)
  const b = index(to)
  return LEVELS.flatMap((level) => {
    const entries: ScopeDiffEntry[] = []
    for (const [id, text] of b[level]) {
      const before = a[level].get(id)
      if (before === undefined) entries.push({ kind: 'added', level, id, text })
      else if (before !== text) entries.push({ kind: 'changed', level, id, text, before })
    }
    for (const [id, text] of a[level]) if (!b[level].has(id)) entries.push({ kind: 'removed', level, id, text })
    return entries
  })
}

const NOUN: Record<DiffLevel, [singular: string, plural: string]> = {
  feature: ['feature', 'features'],
  story: ['story', 'stories'],
  ac: ['AC', 'ACs'],
}

/** "+1 feature, +1 story, +3 ACs, 1 AC changed, −1 AC" */
export function diffSummary(entries: ScopeDiffEntry[]): string {
  const parts: string[] = []
  const add = (kind: DiffKind, format: (n: number, noun: string) => string) => {
    for (const level of LEVELS) {
      const n = entries.filter((e) => e.kind === kind && e.level === level).length
      if (n > 0) parts.push(format(n, NOUN[level][n === 1 ? 0 : 1]))
    }
  }
  add('added', (n, noun) => `+${n} ${noun}`)
  add('changed', (n, noun) => `${n} ${noun} changed`)
  add('removed', (n, noun) => `−${n} ${noun}`)
  return parts.length > 0 ? parts.join(', ') : 'No changes'
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/diffScopes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/diffScopes.ts src/lib/progress/diffScopes.test.ts
git commit -m "feat: diff scope versions"
```

---

### Task 5: Demo data for proposals, SCRs and pending user testing

Adds a 👤 AC pending user testing to A and B, gives every SCR a proposal, adds B's SCR-2 (pending) and SCR-3 (rejected), and removes the mock `pending_decision` / `pending_user_testing` warnings (Task 6 computes them).

New numbers (used by later tasks):
- **A:** 17 ACs (4 👤), completion 35%, delivery 47%, 1 pending user testing (AC-2.1.5 since 11 Oct 14:00). Approving SCR-1 → 20 ACs, completion 30%, delivery 40%.
- **B:** v1 19 ACs, v1.1 21 ACs, completion 57%, delivery 71%, 1 pending user testing (AC-4.1.5), 1 pending approval (SCR-2). Approving SCR-2 → 22 ACs, completion 55%.
- **C:** unchanged numbers; 3 pending user testing.

**Files:**
- Modify: `src/lib/mock/project-a.ts`, `src/lib/mock/project-b.ts`, `src/lib/mock/project-c.ts`
- Test: `src/lib/mock/project-a.test.ts`, `project-b.test.ts`, `project-c.test.ts`, `integrity.test.ts`, `src/lib/data/view-models.test.ts`, `src/lib/data/mock-repository.test.ts`

- [ ] **Step 1: Update the project tests first (they will fail)**

In `src/lib/mock/project-a.test.ts`, replace everything from `it('has a fresh v1` to the end of the file with:

```ts
  it('has a fresh v1 with 4 features, 17 ACs and 4 👤 ACs', () => {
    expect(expenseTracker.project.scopeVersions.map((v) => v.label)).toEqual(['v1'])
    expect(scope.features).toHaveLength(4)
    expect(acsOf(scope)).toHaveLength(17)
    expect(acsOf(scope).filter((a) => a.humanTest)).toHaveLength(4)
  })

  it('is mid-way: about 45% delivered', () => {
    expect(r.completionPct).toBe(35)
    expect(r.deliveryPct).toBe(47)
    expect(r.counts.in_progress).toBe(7)
  })

  it('has one 👤 AC waiting for a tester', () => {
    expect(r.pendingUserTesting).toBe(1)
    expect(r.oldestPendingSince).toBe('2026-10-11T14:00:00+02:00')
  })

  it('has exactly one pending SCR, raised from an agent PR, proposing CSV export', () => {
    const pending = expenseTracker.scrs.filter((s) => s.status === 'pending')
    expect(pending).toHaveLength(1)
    expect(pending[0].source).toBe('agent_pr')
    expect(pending[0].proposal?.addStories.map((a) => [a.featureId, a.featureTitle, a.story.acs.length])).toEqual([['F5', 'Export', 3]])
    expect(pending[0].proposal?.tasks.map((t) => t.id)).toEqual(['T-08'])
  })

  it('has the planned mock warnings (pending ones are computed)', () => {
    expect(expenseTracker.warnings.map((s) => s.type).sort()).toEqual(['pr_format', 'stalled_task'])
  })
})
```

In `src/lib/mock/project-b.test.ts`, change the import line `import { acsOf } from '@/lib/domain/scope'` to:

```ts
import { acsOf } from '@/lib/domain/scope'
import { applyProposal } from '@/lib/progress/scopeChange'
```

and replace everything from `it('has a baseline v1` to the end of the file with:

```ts
  it('has a baseline v1 of 19 ACs and a v1.1 that adds 2', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    expect(v1.label).toBe('v1')
    expect(acsOf(v1)).toHaveLength(19)
    expect(v11.label).toBe('v1.1')
    expect(acsOf(v11)).toHaveLength(21)
  })

  it('has exactly one regressed AC', () => {
    expect(statuses.filter((s) => s.state === 'regressed').map((s) => s.acId)).toEqual(['AC-3.1.2'])
  })

  it('is 57% complete and 71% delivered, with one 👤 AC waiting', () => {
    expect(r.completionPct).toBe(57)
    expect(r.deliveryPct).toBe(71)
    expect(r.pendingUserTesting).toBe(1)
  })

  it('has red-main, regression and ticked-but-red warnings', () => {
    expect(customerPortal.warnings.map((s) => s.type).sort()).toEqual(['red_main', 'regression', 'ticked_but_red'])
    const regression = customerPortal.warnings.find((s) => s.type === 'regression')
    expect(regression?.links.acId).toBe('AC-3.1.2')
    expect(regression?.links.prNumber).toBe(106)
  })

  it('locks v1.1 when its scope change is approved, with the matching proposal', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    const scr1 = customerPortal.scrs.find((s) => s.id === 'SCR-1')
    if (!scr1?.proposal) throw new Error('SCR-1 needs a proposal')
    expect(scr1.decidedAt).toBe(v11.lockedAt)
    expect(scr1.decidedBy).toBe(v11.approvedBy)
    expect(v11.changedBy).toBe('SCR-1')
    expect(applyProposal(v1.features, scr1.proposal)).toEqual(v11.features)
  })

  it('has one approved, one pending and one rejected SCR', () => {
    expect(customerPortal.scrs.map((s) => [s.id, s.status, s.source])).toEqual([
      ['SCR-1', 'approved', 'agent_pr'],
      ['SCR-2', 'pending', 'pulse'],
      ['SCR-3', 'rejected', 'human'],
    ])
    expect(customerPortal.scrs[2].decisionReason).toBe('Not in this release: support answers by email only.')
  })
})
```

In `src/lib/mock/project-c.test.ts`, replace the last test with:

```ts
  it('has unplanned-work and unchecked-ACs mock warnings (pending user testing is computed)', () => {
    expect(intelligentFlow.warnings.map((s) => s.type).sort()).toEqual(['unchecked_acs_merged', 'unplanned_work'])
  })
```

In `src/lib/mock/integrity.test.ts`, add these tests at the end of the `describe.each` block (before its closing `})`):

```ts
  it('ties SCR proposals to known features, stories and ACs', () => {
    const featureIds = project.scopeVersions.flatMap((v) => v.features.map((f) => f.id))
    for (const s of scrs) {
      if (!s.proposal) continue
      for (const a of s.proposal.addStories) if (!a.featureTitle) expect(featureIds, `${s.id} → ${a.featureId}`).toContain(a.featureId)
      for (const a of s.proposal.addAcs) expect(storyIds, `${s.id} → ${a.storyId}`).toContain(a.storyId)
      for (const c of s.proposal.changeAcs) expect(acIds, `${s.id} → ${c.acId}`).toContain(c.acId)
      for (const id of s.proposal.removeAcIds) expect(acIds, `${s.id} → ${id}`).toContain(id)
    }
  })

  it('gives pending SCRs new AC and task ids', () => {
    for (const s of scrs) {
      if (s.status !== 'pending' || !s.proposal) continue
      const newAcIds = [...s.proposal.addStories.flatMap((a) => a.story.acs.map((x) => x.id)), ...s.proposal.addAcs.map((a) => a.ac.id)]
      for (const id of newAcIds) expect(acIds, `${s.id} → ${id}`).not.toContain(id)
      for (const t of s.proposal.tasks) expect(taskIds, `${s.id} → ${t.id}`).not.toContain(t.id)
    }
  })

  it('records who decided every decided SCR, and when', () => {
    for (const s of scrs) {
      if (s.status === 'pending') continue
      expect(s.decidedAt, s.id).toBeDefined()
      expect(s.decidedBy, s.id).toBeDefined()
    }
  })

  it('leaves pending decisions and pending user testing to be computed', () => {
    expect(warnings.filter((w) => w.type === 'pending_decision' || w.type === 'pending_user_testing')).toEqual([])
  })
```

In `src/lib/data/view-models.test.ts`, replace the `toMatchObject` in `'builds a portfolio row'` with:

```ts
    expect(toPortfolioRow(customerPortal)).toMatchObject({
      id: 'customer-portal', scopeLabel: 'v1.1', completionPct: 57, deliveryPct: 71, verified: 12, total: 21,
      openWarnings: 3, highWarnings: 2, pendingApprovals: 1, pendingUserTesting: 1,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
```

and in `'builds an overview…'` change `expect(o.rollup.total).toBe(20)` to `expect(o.rollup.total).toBe(21)`.

In `src/lib/data/mock-repository.test.ts`, replace the `toMatchObject` in `'returns one row per demo project…'` with:

```ts
    expect(portal).toMatchObject({
      scopeLabel: 'v1.1', completionPct: 57, deliveryPct: 71, verified: 12, total: 21,
      openWarnings: 3, highWarnings: 2, pendingApprovals: 1, pendingUserTesting: 1,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
```

and in `'returns rollup, top warnings and activity'` change `expect(o.rollup.total).toBe(20)` to `expect(o.rollup.total).toBe(21)`.

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/mock src/lib/data`
Expected: FAIL on the new numbers (e.g. `expected 16 to have length 17`) and on missing proposals.

- [ ] **Step 3: Update project A**

In `src/lib/mock/project-a.ts`:

1. In story `US-2.1`, add a fifth AC after `AC-2.1.4`:
   ```ts
              ac('AC-2.1.5', 'The expense list is easy to scan on a phone', true),
   ```
2. In task `T-03`, change `acIds` to `['AC-2.1.1', 'AC-2.1.3', 'AC-2.1.4', 'AC-2.1.5']`.
3. In PR #3, change `testPlan` to `[ticked('AC-2.1.1', 'e2e', 'expenses.spec.ts'), ticked('AC-2.1.3', 'unit', 'expenses.test.ts'), unticked('AC-2.1.4'), unticked('AC-2.1.5')]`.
4. Replace the `scrs` array with:
   ```ts
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
   ```
5. In `warnings`, delete the `WRN-1` (`pending_decision`) line. Keep `WRN-2` and `WRN-3`.

- [ ] **Step 4: Update project B**

In `src/lib/mock/project-b.ts`:

1. In `support` (story `US-4.1`), add after `AC-4.1.4`:
   ```ts
    ac('AC-4.1.5', 'The ticket form can be used with a screen reader', true),
   ```
2. Below `const invoices = …`, add:
   ```ts
const pdfAcs: AcceptanceCriterion[] = [
  ac('AC-3.1.5', 'An invoice can be downloaded as a PDF'),
  ac('AC-3.1.6', 'The PDF matches the invoice shown on screen', true),
]
   ```
3. Replace the `v1.1` entry of `scopeVersions` with:
   ```ts
      {
        label: 'v1.1',
        lockedAt: at(10, 6, 14),
        approvedBy: 'Lena Fischer',
        changedBy: 'SCR-1',
        features: [signIn, account, invoices([...invoiceAcs, ...pdfAcs]), support, notifications],
      },
   ```
4. In task `T-06`, change `acIds` to `['AC-4.1.1', 'AC-4.1.2', 'AC-4.1.3', 'AC-4.1.4', 'AC-4.1.5']`.
5. In PR #105, change `testPlan` to `[ticked('AC-4.1.1', 'integration', 'tickets.test.ts'), ticked('AC-4.1.2', 'e2e', 'tickets.spec.ts'), unticked('AC-4.1.3'), ticked('AC-4.1.4', 'integration', 'ticket-access.test.ts'), unticked('AC-4.1.5')]`.
6. Replace the `scrs` array with:
   ```ts
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
   ```

- [ ] **Step 5: Update project C**

In `src/lib/mock/project-c.ts`, delete the `WRN-3` (`pending_user_testing`) line from `warnings`.

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/mock src/lib/data src/lib/progress`
Expected: PASS. If `diffScopes.test.ts` fails, check that B's v1.1 still only differs from v1 by `pdfAcs`.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. A component test that hard-codes A or B numbers would fail here; update its expected value to the numbers above.

- [ ] **Step 8: Commit**

```bash
git add src/lib/mock src/lib/data/view-models.test.ts src/lib/data/mock-repository.test.ts
git commit -m "feat: add scope proposals, more SCRs and pending user testing to the demo data"
```

---

### Task 6: Compute the pending-user-testing and pending-decision warnings

**Files:**
- Create: `src/lib/progress/deriveWarnings.ts`
- Test: `src/lib/progress/deriveWarnings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/deriveWarnings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { intelligentFlow } from '@/lib/mock/project-c'
import { deriveAcStates } from './deriveAcStates'
import { deriveWarnings } from './deriveWarnings'

const warningsOf = (data: typeof expenseTracker, now = DEMO_NOW) => deriveWarnings(data, deriveAcStates(data), now)

describe('deriveWarnings', () => {
  it('adds one pending-user-testing warning with the count and the oldest date', () => {
    const warnings = warningsOf(intelligentFlow)
    expect(warnings.map((w) => w.type).sort()).toEqual(['pending_user_testing', 'unchecked_acs_merged', 'unplanned_work'])
    expect(warnings.find((w) => w.type === 'pending_user_testing')).toMatchObject({
      severity: 'low',
      message: '3 👤 ACs are waiting for a tester, the oldest since 25 Sep',
      suggestedAction: 'Assign a tester and start with the oldest',
      raisedAt: '2026-09-25T17:00:00+02:00',
    })
  })

  it('uses the singular for one waiting AC', () => {
    expect(warningsOf(expenseTracker).find((w) => w.type === 'pending_user_testing')?.message).toBe('1 👤 AC is waiting for a tester, since 11 Oct')
  })

  it('adds no pending-user-testing warning when nothing is waiting', () => {
    const noPrs = { ...intelligentFlow, prs: [] }
    expect(warningsOf(noPrs).some((w) => w.type === 'pending_user_testing')).toBe(false)
  })

  it('flags a pending SCR older than 24 h and names the approver', () => {
    expect(warningsOf(expenseTracker).find((w) => w.type === 'pending_decision')).toMatchObject({
      severity: 'medium',
      message: 'SCR-1 (Add CSV export of expenses) has been waiting for approval for 2 days',
      suggestedAction: 'Ping the approver, Maya Patel',
      links: { prNumber: 5 },
    })
  })

  it('does not flag a pending SCR within its first 24 h, or a decided one', () => {
    expect(warningsOf(expenseTracker, '2026-10-14T16:00:00+02:00').some((w) => w.type === 'pending_decision')).toBe(false)
    const decided = { ...expenseTracker, scrs: expenseTracker.scrs.map((s) => ({ ...s, status: 'approved' as const })) }
    expect(warningsOf(decided).some((w) => w.type === 'pending_decision')).toBe(false)
  })

  it('replaces mock records of the computed types', () => {
    const stale = { ...intelligentFlow, prs: [], warnings: [...intelligentFlow.warnings, { ...intelligentFlow.warnings[0], id: 'OLD', type: 'pending_user_testing' as const }] }
    expect(warningsOf(stale).map((w) => w.id)).not.toContain('OLD')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/deriveWarnings.test.ts`
Expected: FAIL. Cannot find module `./deriveWarnings`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/deriveWarnings.ts`:

```ts
import { currentScope } from '@/lib/domain/scope'
import type { IsoDateTime, ProjectData, Warning, WarningType } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import type { AcStatus } from './deriveAcStates'
import { rollup } from './rollup'

/** Warning types computed from the data, so they follow demo decisions. The other types are mock records. */
const COMPUTED: ReadonlySet<WarningType> = new Set<WarningType>(['pending_user_testing', 'pending_decision'])
const DAY_MS = 24 * 60 * 60 * 1000

export function deriveWarnings(data: ProjectData, acStates: AcStatus[], now: IsoDateTime): Warning[] {
  const projectId = data.project.id
  const warnings = data.warnings.filter((w) => !COMPUTED.has(w.type))

  const { pendingUserTesting: n, oldestPendingSince: since } = rollup(acStates)
  if (since) {
    warnings.push({
      id: 'WRN-USER-TESTING',
      projectId,
      type: 'pending_user_testing',
      severity: 'low',
      message:
        n === 1
          ? `1 👤 AC is waiting for a tester, since ${formatDate(since)}`
          : `${n} 👤 ACs are waiting for a tester, the oldest since ${formatDate(since)}`,
      suggestedAction: 'Assign a tester and start with the oldest',
      raisedAt: since,
      links: {},
    })
  }

  const approver = currentScope(data.project).approvedBy
  for (const scr of data.scrs) {
    const waited = Date.parse(now) - Date.parse(scr.raisedAt)
    if (scr.status !== 'pending' || waited <= DAY_MS) continue
    const days = Math.floor(waited / DAY_MS)
    warnings.push({
      id: `WRN-${scr.id}`,
      projectId,
      type: 'pending_decision',
      severity: 'medium',
      message: `${scr.id} (${scr.title}) has been waiting for approval for ${days} ${days === 1 ? 'day' : 'days'}`,
      suggestedAction: `Ping the approver, ${approver}`,
      raisedAt: new Date(Date.parse(scr.raisedAt) + DAY_MS).toISOString(),
      links: scr.prNumber !== undefined ? { prNumber: scr.prNumber } : {},
    })
  }
  return warnings
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/deriveWarnings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/deriveWarnings.ts src/lib/progress/deriveWarnings.test.ts
git commit -m "feat: compute pending user testing and pending decision warnings"
```

---

### Task 7: Merge stored decisions into project data

**Files:**
- Create: `src/lib/progress/applyProjectDecisions.ts`
- Test: `src/lib/progress/applyProjectDecisions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/applyProjectDecisions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS, type ScrDecision } from '@/lib/domain/planner'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { HumanTestResult, ProjectData } from '@/lib/domain/types'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { applyProjectDecisions } from './applyProjectDecisions'
import { deriveAcStates } from './deriveAcStates'
import { rollup } from './rollup'

const approve = (decidedAt = DEMO_NOW): ScrDecision => ({ status: 'approved', decidedAt, decidedBy: 'Maya Patel', reason: 'Accountants need it' })
const labels = (data: ProjectData) => data.project.scopeVersions.map((v) => v.label)
const stateOf = (data: ProjectData, acId: string) => deriveAcStates(data).find((s) => s.acId === acId)?.state
const tested = (result: 'pass' | 'fail'): HumanTestResult => ({ acId: 'AC-2.1.5', result, environment: 'staging', tester: 'Tom Becker', testedAt: DEMO_NOW })

describe('applyProjectDecisions', () => {
  it('without decisions, returns the mock data plus computed warnings', () => {
    const data = applyProjectDecisions(expenseTracker, EMPTY_DECISIONS, DEMO_NOW)
    expect(labels(data)).toEqual(['v1'])
    expect(data.warnings.map((w) => w.type).sort()).toEqual(['pending_decision', 'pending_user_testing', 'pr_format', 'stalled_task'])
  })

  it('applies a recorded pass: the AC is verified and nothing waits for a tester', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, humanTests: [tested('pass')] }, DEMO_NOW)
    expect(stateOf(data, 'AC-2.1.5')).toBe('verified')
    expect(data.humanTests).toHaveLength(2)
    expect(data.warnings.some((w) => w.type === 'pending_user_testing')).toBe(false)
  })

  it('applies a recorded fail: the AC is failing', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, humanTests: [tested('fail')] }, DEMO_NOW)
    expect(stateOf(data, 'AC-2.1.5')).toBe('failing')
  })

  it('approving SCR-1 creates v1.1 from its proposal and adds its task', () => {
    const data = applyProjectDecisions(expenseTracker, { ...EMPTY_DECISIONS, scrs: { 'SCR-1': approve() } }, DEMO_NOW)
    expect(labels(data)).toEqual(['v1', 'v1.1'])
    expect(currentScope(data.project)).toMatchObject({ lockedAt: DEMO_NOW, approvedBy: 'Maya Patel', changedBy: 'SCR-1' })
    expect(acsOf(currentScope(data.project))).toHaveLength(20)
    expect(data.tasks.find((t) => t.id === 'T-08')).toMatchObject({ projectId: 'expense-tracker', storyId: 'US-5.1' })
    expect(data.scrs[0]).toMatchObject({ status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Maya Patel', decisionReason: 'Accountants need it' })
    expect(rollup(deriveAcStates(data)).completionPct).toBe(30)
    expect(data.warnings.some((w) => w.type === 'pending_decision')).toBe(false)
  })

  it('rejecting an SCR records the decision and keeps the scope', () => {
    const reject: ScrDecision = { status: 'rejected', decidedAt: DEMO_NOW, decidedBy: 'Lena Fischer', reason: 'Not now' }
    const data = applyProjectDecisions(customerPortal, { ...EMPTY_DECISIONS, scrs: { 'SCR-2': reject } }, DEMO_NOW)
    expect(labels(data)).toEqual(['v1', 'v1.1'])
    expect(data.scrs.find((s) => s.id === 'SCR-2')).toMatchObject({ status: 'rejected', decidedBy: 'Lena Fischer', decisionReason: 'Not now' })
    expect(data.tasks.map((t) => t.id)).not.toContain('T-08')
  })

  it('applies two approvals in decision order: v1.1, then v1.2', () => {
    const second = {
      ...expenseTracker.scrs[0],
      id: 'SCR-9',
      title: 'Clearer empty month',
      proposal: { addStories: [], addAcs: [], changeAcs: [{ acId: 'AC-4.1.3', text: 'An empty month says “No expenses yet”' }], removeAcIds: ['AC-4.1.5'], tasks: [] },
    }
    const base = { ...expenseTracker, scrs: [...expenseTracker.scrs, second] }
    const data = applyProjectDecisions(
      base,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': approve('2026-10-16T10:00:00+02:00'), 'SCR-9': approve('2026-10-16T09:30:00+02:00') } },
      '2026-10-16T11:00:00+02:00',
    )
    expect(data.project.scopeVersions.map((v) => [v.label, v.changedBy])).toEqual([['v1', undefined], ['v1.1', 'SCR-9'], ['v1.2', 'SCR-1']])
    const acs = acsOf(currentScope(data.project))
    expect(acs.find((a) => a.id === 'AC-4.1.3')?.text).toBe('An empty month says “No expenses yet”')
    expect(acs.map((a) => a.id)).not.toContain('AC-4.1.5')
    expect(acs).toHaveLength(19)
  })

  it('ignores stored decisions for SCRs that the mocks already decided', () => {
    const data = applyProjectDecisions(
      customerPortal,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': { ...approve(), status: 'rejected' }, 'SCR-3': approve() } },
      DEMO_NOW,
    )
    expect(data.scrs.find((s) => s.id === 'SCR-1')?.status).toBe('approved')
    expect(data.scrs.find((s) => s.id === 'SCR-3')?.status).toBe('rejected')
    expect(labels(data)).toEqual(['v1', 'v1.1'])
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/applyProjectDecisions.test.ts`
Expected: FAIL. Cannot find module `./applyProjectDecisions`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/applyProjectDecisions.ts`:

```ts
import type { ProjectDecisions } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData, ScopeChangeRequest, ScopeProposal, ScopeVersion, Task } from '@/lib/domain/types'
import { deriveAcStates } from './deriveAcStates'
import { deriveWarnings } from './deriveWarnings'
import { applyProposal, nextVersionLabel } from './scopeChange'

type Approved = ScopeChangeRequest & { decidedAt: IsoDateTime; decidedBy: string; proposal: ScopeProposal }

/** Mock data plus the human decisions stored in this browser (README §3.2–3.4). Pure. */
export function applyProjectDecisions(data: ProjectData, decisions: ProjectDecisions, now: IsoDateTime): ProjectData {
  const stored = decisions.scrs ?? {}
  const approvedNow: Approved[] = []

  const scrs = data.scrs.map((scr) => {
    const decision = stored[scr.id]
    // The mocks' own decisions are final; only pending SCRs take a stored decision.
    if (scr.status !== 'pending' || !decision) return scr
    const decided = { ...scr, status: decision.status, decidedAt: decision.decidedAt, decidedBy: decision.decidedBy, decisionReason: decision.reason }
    if (decided.status === 'approved' && decided.proposal) approvedNow.push({ ...decided, proposal: decided.proposal })
    return decided
  })
  approvedNow.sort((a, b) => Date.parse(a.decidedAt) - Date.parse(b.decidedAt) || a.id.localeCompare(b.id))

  const scopeVersions: ScopeVersion[] = [...data.project.scopeVersions]
  const tasks: Task[] = [...data.tasks]
  for (const scr of approvedNow) {
    const current = scopeVersions[scopeVersions.length - 1]
    scopeVersions.push({
      label: nextVersionLabel(current.label),
      lockedAt: scr.decidedAt,
      approvedBy: scr.decidedBy,
      changedBy: scr.id,
      features: applyProposal(current.features, scr.proposal),
    })
    tasks.push(...scr.proposal.tasks.map((t) => ({ ...t, projectId: data.project.id })))
  }

  const merged: ProjectData = {
    ...data,
    project: { ...data.project, scopeVersions },
    tasks,
    humanTests: [...data.humanTests, ...(decisions.humanTests ?? [])],
    scrs,
  }
  return { ...merged, warnings: deriveWarnings(merged, deriveAcStates(merged), now) }
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/applyProjectDecisions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/applyProjectDecisions.ts src/lib/progress/applyProjectDecisions.test.ts
git commit -m "feat: merge stored decisions into project data"
```

---

### Task 8: Changelog entries

**Files:**
- Create: `src/lib/progress/changelog.ts`
- Test: `src/lib/progress/changelog.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/changelog.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { applyProjectDecisions } from './applyProjectDecisions'
import { changelog } from './changelog'
import { diffSummary } from './diffScopes'

describe('changelog', () => {
  it('lists versions and rejections newest first', () => {
    const entries = changelog(customerPortal)
    expect(entries.map((e) => [e.kind, e.at])).toEqual([
      ['version', '2026-10-06T14:00:00+02:00'],
      ['rejected', '2026-10-03T11:00:00+02:00'],
      ['initial', '2026-09-22T11:00:00+02:00'],
    ])
  })

  it('describes a new version with its SCR and diff', () => {
    const [entry] = changelog(customerPortal)
    if (entry.kind !== 'version') throw new Error('expected a version entry')
    expect(entry).toMatchObject({ from: 'v1', to: 'v1.1', approvedBy: 'Lena Fischer' })
    expect(entry.scr?.id).toBe('SCR-1')
    expect(diffSummary(entry.diff)).toBe('+2 ACs')
  })

  it('describes the initial version and a rejection', () => {
    const entries = changelog(customerPortal)
    expect(entries[2]).toEqual({ kind: 'initial', at: '2026-09-22T11:00:00+02:00', version: 'v1', approvedBy: 'Lena Fischer' })
    expect(entries[1].kind === 'rejected' && entries[1].scr.id).toBe('SCR-3')
  })

  it('includes decisions made in the demo', () => {
    const decided = applyProjectDecisions(
      expenseTracker,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-1': { status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Maya Patel', reason: 'Yes' } } },
      DEMO_NOW,
    )
    const [entry] = changelog(decided)
    if (entry.kind !== 'version') throw new Error('expected a version entry')
    expect([entry.from, entry.to, entry.at]).toEqual(['v1', 'v1.1', DEMO_NOW])
    expect(diffSummary(entry.diff)).toBe('+1 feature, +1 story, +3 ACs')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/changelog.test.ts`
Expected: FAIL. Cannot find module `./changelog`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/changelog.ts`:

```ts
import type { IsoDateTime, ProjectData, ScopeChangeRequest } from '@/lib/domain/types'
import { diffScopes, type ScopeDiffEntry } from './diffScopes'

export type ChangelogEntry =
  | { kind: 'initial'; at: IsoDateTime; version: string; approvedBy: string }
  | { kind: 'version'; at: IsoDateTime; from: string; to: string; approvedBy: string; scr?: ScopeChangeRequest; diff: ScopeDiffEntry[] }
  | { kind: 'rejected'; at: IsoDateTime; scr: ScopeChangeRequest }

/** The append-only record of scope decisions (README §3.4), newest first. */
export function changelog({ project, scrs }: ProjectData): ChangelogEntry[] {
  const versions = project.scopeVersions
  const entries: ChangelogEntry[] = versions.map((v, i) =>
    i === 0
      ? { kind: 'initial', at: v.lockedAt, version: v.label, approvedBy: v.approvedBy }
      : {
          kind: 'version',
          at: v.lockedAt,
          from: versions[i - 1].label,
          to: v.label,
          approvedBy: v.approvedBy,
          scr: scrs.find((s) => s.id === v.changedBy),
          diff: diffScopes(versions[i - 1], v),
        },
  )
  for (const scr of scrs) {
    if (scr.status === 'rejected' && scr.decidedAt) entries.push({ kind: 'rejected', at: scr.decidedAt, scr })
  }
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/changelog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/changelog.ts src/lib/progress/changelog.test.ts
git commit -m "feat: build the scope changelog"
```

---

### Task 9: Task status and AC progress

**Files:**
- Create: `src/lib/progress/taskStatus.ts`
- Test: `src/lib/progress/taskStatus.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/taskStatus.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AcState } from '@/lib/domain/types'
import { at, pr, task } from '@/lib/mock/builders'
import { expenseTracker } from '@/lib/mock/project-a'
import { deriveAcStates } from './deriveAcStates'
import { acProgress, taskStatus } from './taskStatus'

const P = 'p'
const t = task(P, { id: 'T-1', title: 'Login', storyId: 'US-1', acIds: ['AC-1', 'AC-2'] })
const states = (a: AcState, b: AcState) => new Map<string, AcState>([['AC-1', a], ['AC-2', b]])
const openPr = pr(P, { number: 1, title: 'T-1 Login', taskIds: ['T-1'], state: 'open', openedAt: at(10, 1), ci: 'pending' })

describe('taskStatus', () => {
  it('is done when every AC is verified, even with an open PR', () => {
    expect(taskStatus(t, [openPr], states('verified', 'verified'))).toBe('done')
  })

  it('is in review when a linked PR is open', () => {
    expect(taskStatus(t, [openPr], states('implemented', 'not_started'))).toBe('in_review')
  })

  it('is in progress when any AC moved past not started, including failing', () => {
    expect(taskStatus(t, [], states('failing', 'not_started'))).toBe('in_progress')
    expect(taskStatus(t, [], states('pending_user_testing', 'verified'))).toBe('in_progress')
  })

  it('is not started otherwise, also for ACs outside the scope', () => {
    expect(taskStatus(t, [], states('not_started', 'not_started'))).toBe('not_started')
    expect(taskStatus(t, [], new Map())).toBe('not_started')
  })

  it('gives project A’s tasks the expected statuses', () => {
    const byAc = new Map(deriveAcStates(expenseTracker).map((s) => [s.acId, s.state]))
    expect(expenseTracker.tasks.map((x) => [x.id, taskStatus(x, expenseTracker.prs, byAc)])).toEqual([
      ['T-01', 'done'],
      ['T-02', 'done'],
      ['T-03', 'in_progress'],
      ['T-04', 'not_started'],
      ['T-05', 'in_review'],
      ['T-06', 'in_review'],
      ['T-07', 'not_started'],
    ])
  })
})

describe('acProgress', () => {
  it('counts verified ACs out of the task’s ACs', () => {
    expect(acProgress(t, states('verified', 'failing'))).toEqual({ verified: 1, total: 2 })
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/taskStatus.test.ts`
Expected: FAIL. Cannot find module `./taskStatus`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/taskStatus.ts`:

```ts
import type { AcState, PullRequest, Task } from '@/lib/domain/types'

export type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'done'

/** Board column order. */
export const TASK_STATUSES: readonly TaskStatus[] = ['not_started', 'in_progress', 'in_review', 'done']

/** First match wins: done (all ACs verified) → in review (open PR) → in progress (any AC moved) → not started. */
export function taskStatus(task: Task, prs: PullRequest[], stateById: ReadonlyMap<string, AcState>): TaskStatus {
  const stateOf = (acId: string) => stateById.get(acId) ?? 'not_started'
  if (task.acIds.length > 0 && task.acIds.every((id) => stateOf(id) === 'verified')) return 'done'
  if (prs.some((p) => p.state === 'open' && p.taskIds.includes(task.id))) return 'in_review'
  if (task.acIds.some((id) => stateOf(id) !== 'not_started')) return 'in_progress'
  return 'not_started'
}

export function acProgress(task: Task, stateById: ReadonlyMap<string, AcState>): { verified: number; total: number } {
  return { verified: task.acIds.filter((id) => stateById.get(id) === 'verified').length, total: task.acIds.length }
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/taskStatus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/taskStatus.ts src/lib/progress/taskStatus.test.ts
git commit -m "feat: derive task status from ACs and PRs"
```

---

### Task 10: Impact analysis of a pending SCR

**Files:**
- Create: `src/lib/progress/scrImpact.ts`
- Test: `src/lib/progress/scrImpact.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/scrImpact.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { scrImpact } from './scrImpact'

describe('scrImpact', () => {
  it('shows what A’s CSV export would add and how completion would drop', () => {
    const impact = scrImpact(expenseTracker, expenseTracker.scrs[0])
    expect(impact).toMatchObject({ features: ['Export'], completionBefore: 35, completionAfter: 30 })
    expect(impact?.diff.map((e) => `${e.kind} ${e.id}`)).toEqual(['added F5', 'added US-5.1', 'added AC-5.1.1', 'added AC-5.1.2', 'added AC-5.1.3'])
    expect(impact?.tasks.map((t) => t.id)).toEqual(['T-08'])
  })

  it('shows B’s session warning as one changed and one added AC', () => {
    const scr2 = customerPortal.scrs.find((s) => s.id === 'SCR-2')
    if (!scr2) throw new Error('expected SCR-2')
    const impact = scrImpact(customerPortal, scr2)
    expect(impact).toMatchObject({ features: ['Sign-in'], completionBefore: 57, completionAfter: 55 })
    expect(impact?.diff).toEqual([
      { kind: 'changed', level: 'ac', id: 'AC-1.1.2', text: 'Sessions expire after 30 minutes of inactivity, with a warning 2 minutes before', before: 'Sessions expire after 30 minutes of inactivity' },
      { kind: 'added', level: 'ac', id: 'AC-1.1.4', text: 'Any activity during the warning keeps the session alive' },
    ])
  })

  it('returns null for an SCR without a proposal', () => {
    expect(scrImpact(expenseTracker, { ...expenseTracker.scrs[0], proposal: undefined })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/scrImpact.test.ts`
Expected: FAIL. Cannot find module `./scrImpact`.

- [ ] **Step 3: Implement**

Create `src/lib/progress/scrImpact.ts`:

```ts
import { currentScope } from '@/lib/domain/scope'
import type { ProjectData, ScopeChangeRequest, Task } from '@/lib/domain/types'
import { deriveAcStates } from './deriveAcStates'
import { diffScopes, type ScopeDiffEntry } from './diffScopes'
import { rollup } from './rollup'
import { applyProposal, nextVersionLabel } from './scopeChange'

export interface ScrImpact {
  diff: ScopeDiffEntry[]
  /** Titles of the features the change touches. */
  features: string[]
  tasks: Omit<Task, 'projectId'>[]
  completionBefore: number
  completionAfter: number
}

/** What approving a pending SCR would change (README §3.4 impact analysis). Null without a proposal. */
export function scrImpact(data: ProjectData, scr: ScopeChangeRequest): ScrImpact | null {
  if (!scr.proposal) return null
  const current = currentScope(data.project)
  const features = applyProposal(current.features, scr.proposal)
  const after: ProjectData = {
    ...data,
    project: { ...data.project, scopeVersions: [...data.project.scopeVersions, { ...current, label: nextVersionLabel(current.label), features }] },
    tasks: [...data.tasks, ...scr.proposal.tasks.map((t) => ({ ...t, projectId: data.project.id }))],
  }

  const diff = diffScopes(current, { features })
  const touched = new Set(diff.map((e) => e.id))
  const titles = [...features, ...current.features]
    .filter((f) => touched.has(f.id) || f.stories.some((s) => touched.has(s.id) || s.acs.some((a) => touched.has(a.id))))
    .map((f) => f.title)

  return {
    diff,
    features: [...new Set(titles)],
    tasks: scr.proposal.tasks,
    completionBefore: rollup(deriveAcStates(data)).completionPct,
    completionAfter: rollup(deriveAcStates(after)).completionPct,
  }
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/scrImpact.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress/scrImpact.ts src/lib/progress/scrImpact.test.ts
git commit -m "feat: analyse the impact of a pending scope change"
```

---

### Task 11: Evidence per AC and the user testing queue

**Files:**
- Create: `src/lib/progress/evidence.ts`, `src/lib/progress/userTesting.ts`
- Test: `src/lib/progress/evidence.test.ts`, `src/lib/progress/userTesting.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/progress/evidence.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { customerPortal } from '@/lib/mock/project-b'
import { intelligentFlow } from '@/lib/mock/project-c'
import { evidenceByAc } from './evidence'

const byAc = evidenceByAc(customerPortal)

describe('evidenceByAc', () => {
  it('lists test plan items from merged PRs, newest first', () => {
    expect(byAc.get('AC-3.1.2')).toEqual([
      { kind: 'pr', at: '2026-10-15T14:00:00+02:00', prNumber: 106, mark: 'failed', testType: 'e2e', testFile: 'invoices-filter.spec.ts', ci: 'failing', sha: customerPortal.prs[5].headSha },
      { kind: 'pr', at: '2026-09-18T17:00:00+02:00', prNumber: 103, mark: 'ticked', testType: 'e2e', testFile: 'invoices-filter.spec.ts', ci: 'passing', sha: customerPortal.prs[2].headSha },
    ])
  })

  it('includes human test results', () => {
    expect(byAc.get('AC-2.1.4')?.map((e) => e.kind)).toEqual(['human', 'pr'])
    expect(byAc.get('AC-2.1.4')?.[0]).toMatchObject({ result: 'pass', tester: 'Jonas Weber', environment: 'staging.portal.example' })
  })

  it('ignores open PRs and PRs without a test plan', () => {
    expect(byAc.get('AC-3.1.5')).toBeUndefined()
    expect(evidenceByAc(intelligentFlow).get('AC-3.1.5')).toBeUndefined()
  })
})
```

Create `src/lib/progress/userTesting.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { intelligentFlow } from '@/lib/mock/project-c'
import { deriveAcStates } from './deriveAcStates'
import { userTestingQueue } from './userTesting'

describe('userTestingQueue', () => {
  const queue = userTestingQueue(intelligentFlow, deriveAcStates(intelligentFlow))

  it('lists 👤 ACs pending user testing, oldest first', () => {
    expect(queue.map((q) => q.ac.id)).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
  })

  it('names the story, task and the PR that delivered each AC', () => {
    expect(queue[0]).toMatchObject({
      storyId: 'US-3.1', taskId: 'T-14', prNumber: 206, mergedAt: '2026-09-25T17:00:00+02:00', waitingSince: '2026-09-25T17:00:00+02:00',
    })
  })

  it('is empty when nothing is merged', () => {
    const noPrs = { ...intelligentFlow, prs: [] }
    expect(userTestingQueue(noPrs, deriveAcStates(noPrs))).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/lib/progress/evidence.test.ts src/lib/progress/userTesting.test.ts`
Expected: FAIL. Cannot find modules `./evidence` and `./userTesting`.

- [ ] **Step 3: Implement evidence**

Create `src/lib/progress/evidence.ts`:

```ts
import type { CiStatus, IsoDateTime, ProjectData, TestPlanMark, TestType } from '@/lib/domain/types'

export type EvidenceItem =
  | { kind: 'pr'; at: IsoDateTime; prNumber: number; mark: TestPlanMark; testType?: TestType; testFile?: string; ci: CiStatus; sha: string }
  | { kind: 'human'; at: IsoDateTime; result: 'pass' | 'fail'; environment: string; tester: string; notes?: string }

/** Evidence per AC id (README §2): test plan items of merged PRs and human test results, newest first. */
export function evidenceByAc({ prs, humanTests }: ProjectData): Map<string, EvidenceItem[]> {
  const byAc = new Map<string, EvidenceItem[]>()
  const add = (acId: string, item: EvidenceItem) => byAc.set(acId, [...(byAc.get(acId) ?? []), item])

  for (const pr of prs) {
    if (pr.state !== 'merged' || !pr.mergedAt) continue
    for (const item of pr.testPlan) {
      if (!item.acId) continue
      add(item.acId, { kind: 'pr', at: pr.mergedAt, prNumber: pr.number, mark: item.mark, testType: item.testType, testFile: item.testFile, ci: pr.ci, sha: pr.headSha })
    }
  }
  for (const t of humanTests) {
    add(t.acId, { kind: 'human', at: t.testedAt, result: t.result, environment: t.environment, tester: t.tester, notes: t.notes })
  }
  for (const items of byAc.values()) items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return byAc
}
```

- [ ] **Step 4: Implement the user testing queue**

Create `src/lib/progress/userTesting.ts`:

```ts
import { currentScope } from '@/lib/domain/scope'
import type { AcceptanceCriterion, IsoDateTime, ProjectData } from '@/lib/domain/types'
import type { AcStatus } from './deriveAcStates'

export interface UserTestingItem {
  ac: AcceptanceCriterion
  storyId: string
  taskId?: string
  /** The latest merged PR that touches the AC. */
  prNumber?: number
  mergedAt?: IsoDateTime
  waitingSince: IsoDateTime
}

/** 👤 ACs whose code is merged and that wait for a human result, oldest first (README §3.2 Human testing). */
export function userTestingQueue(data: ProjectData, acStates: AcStatus[]): UserTestingItem[] {
  const located = new Map(
    currentScope(data.project).features.flatMap((f) => f.stories.flatMap((s) => s.acs.map((ac) => [ac.id, { ac, storyId: s.id }] as const))),
  )

  return acStates
    .filter((s) => s.state === 'pending_user_testing')
    .flatMap((status) => {
      const where = located.get(status.acId)
      const waitingSince = status.history.at(-1)?.at
      if (!where || !waitingSince) return []
      const taskIds = new Set(data.tasks.filter((t) => t.acIds.includes(status.acId)).map((t) => t.id))
      const merged = data.prs
        .filter((p) => p.state === 'merged' && p.mergedAt && (p.taskIds.some((id) => taskIds.has(id)) || p.testPlan.some((i) => i.acId === status.acId)))
        .sort((a, b) => Date.parse(b.mergedAt ?? '') - Date.parse(a.mergedAt ?? ''))[0]
      return [{ ...where, taskId: [...taskIds][0], prNumber: merged?.number, mergedAt: merged?.mergedAt, waitingSince }]
    })
    .sort((a, b) => Date.parse(a.waitingSince) - Date.parse(b.waitingSince))
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/lib/progress/evidence.test.ts src/lib/progress/userTesting.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/progress/evidence.ts src/lib/progress/evidence.test.ts src/lib/progress/userTesting.ts src/lib/progress/userTesting.test.ts
git commit -m "feat: collect evidence per AC and the user testing queue"
```

---

### Task 12: Repository returns raw project data

The old view methods stay until Task 15, so the app keeps working in between.

**Files:**
- Modify: `src/lib/data/repository.ts`, `src/lib/data/mock-repository.ts`
- Test: `src/lib/data/mock-repository.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/data/mock-repository.test.ts`:

```ts
describe('MockRepository.getProjectData', () => {
  it('returns a project’s raw data, or null for drafts and unknown ids', async () => {
    expect((await repo.getProjectData('customer-portal'))?.project.name).toBe('Customer portal')
    expect(await repo.getProjectData('intelligent-flow-v2')).toBeNull()
    expect(await repo.getProjectData('nope')).toBeNull()
  })

  it('lists every project', async () => {
    expect((await repo.getAllProjectData()).map((d) => d.project.id)).toEqual(['expense-tracker', 'customer-portal', 'intelligent-flow'])
  })
})
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `npx vitest run src/lib/data/mock-repository.test.ts`
Expected: FAIL. `repo.getProjectData is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/data/repository.ts`, change the type import to:

```ts
import type { BoardKind, IsoDateTime, ProjectData, ProjectKind, Warning } from '@/lib/domain/types'
```

and add to `PulseRepository`, above `getPlannerDraft`:

```ts
  /** Raw facts for one project; screens merge browser decisions on top. Null for unknown ids and drafts. */
  getProjectData(projectId: string): Promise<ProjectData | null>
  getAllProjectData(): Promise<ProjectData[]>
```

In `src/lib/data/mock-repository.ts`, add above `async getPlannerDraft`:

```ts
    async getProjectData(projectId) {
      return find(projectId) ?? null
    },

    async getAllProjectData() {
      return projects
    },
```

- [ ] **Step 4: Run the test to make sure it passes**

Run: `npx vitest run src/lib/data/mock-repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/repository.ts src/lib/data/mock-repository.ts src/lib/data/mock-repository.test.ts
git commit -m "feat: serve raw project data from the repository"
```

---

### Task 13: Project data provider, layout and Overview

**Files:**
- Create: `src/components/project/project-data-provider.tsx`
- Create: `src/components/project/overview-view.tsx`
- Create: `src/components/project/test-utils.tsx`
- Modify: `src/app/projects/[projectId]/layout.tsx`, `src/app/projects/[projectId]/page.tsx`
- Delete: `src/components/project/draft-project-layout.tsx`, `src/components/project/draft-overview.tsx`, `src/components/project/draft-project.test.tsx`
- Test: `src/components/project/project-data-provider.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/project-data-provider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { expenseTracker } from '@/lib/mock/project-a'
import { OverviewView } from './overview-view'
import { ProjectDataProvider, useProject } from './project-data-provider'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const V2 = draft.brief.projectId
const A = expenseTracker.project.id

describe('ProjectDataProvider', () => {
  beforeEach(() => {
    store.reset(V2)
    store.reset(A)
  })

  it('renders a mock project’s header, sidebar and overview', () => {
    render(<ProjectDataProvider source={{ kind: 'project', data: expenseTracker }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Expense tracker' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 6 Oct by Maya Patel/)).toBeInTheDocument()
    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
    expect(screen.getByText('6 of 17 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('SCR-1 (Add CSV export of expenses) has been waiting for approval for 2 days')).toBeInTheDocument()
  })

  it('applies stored decisions to the header and overview', () => {
    store.decideScr(A, 'SCR-1', { status: 'approved', decidedAt: NOW, decidedBy: 'Maya Patel', reason: 'Yes' })
    render(<ProjectDataProvider source={{ kind: 'project', data: expenseTracker }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeInTheDocument()
    expect(screen.queryByText('1 pending approval')).not.toBeInTheDocument()
    expect(screen.getByText('6 of 20 ACs verified')).toBeInTheDocument()
  })

  it('says Intelligent Flow v2 is not locked yet and links to the wizard', () => {
    render(<ProjectDataProvider source={{ kind: 'draft', draft }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the wizard' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: '← Portfolio' })).toHaveAttribute('href', '/')
  })

  it('shows Intelligent Flow v2 once v1 is locked', () => {
    store.decideAll(V2, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(V2, NOW, 'Demo approver')
    render(<ProjectDataProvider source={{ kind: 'draft', draft }} now={NOW}><OverviewView /></ProjectDataProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 16 Oct by Demo approver/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('0 of 28 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('No open warnings.')).toBeInTheDocument()
  })

  it('useProject throws outside the provider', () => {
    function Orphan() {
      useProject()
      return null
    }
    expect(() => render(<Orphan />)).toThrow('useProject must be used inside ProjectDataProvider')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/project-data-provider.test.tsx`
Expected: FAIL. Cannot find module `./overview-view`.

- [ ] **Step 3: Implement the provider**

Create `src/components/project/project-data-provider.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { createContext, useContext, useMemo } from 'react'
import { toProjectHeader } from '@/lib/data/view-models'
import { useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { applyProjectDecisions } from '@/lib/progress/applyProjectDecisions'
import { deriveAcStates, type AcStatus } from '@/lib/progress/deriveAcStates'
import { ProjectShell } from './project-shell'

/** What the server loaded: a mock project, or the wizard's draft (it only exists once this browser locks v1). */
export type ProjectSource = { kind: 'project'; data: ProjectData } | { kind: 'draft'; draft: PlannerDraft }

export interface ProjectContextValue {
  /** Mock data merged with this browser's decisions. */
  data: ProjectData
  acStates: AcStatus[]
  now: IsoDateTime
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext)
  if (!value) throw new Error('useProject must be used inside ProjectDataProvider')
  return value
}

const projectIdOf = (source: ProjectSource) => (source.kind === 'project' ? source.data.project.id : source.draft.brief.projectId)

export function ProjectDataProvider({ source, now, children }: { source: ProjectSource; now: IsoDateTime; children: React.ReactNode }) {
  const decisions = useDecisions(projectIdOf(source))
  const isClient = useIsClient()

  const value = useMemo(() => {
    const base = source.kind === 'project' ? source.data : applyDecisions(source.draft, decisions)
    if (!base) return null
    const data = applyProjectDecisions(base, decisions, now)
    return { data, acStates: deriveAcStates(data), now }
  }, [source, decisions, now])

  // Mock projects render on the server with no decisions; the draft needs this browser's decisions first.
  if (source.kind === 'draft' && !isClient) return null
  if (!value) return <NotLockedYet name={source.kind === 'draft' ? source.draft.brief.name : ''} />

  return (
    <ProjectContext.Provider value={value}>
      <ProjectShell header={toProjectHeader(value.data)}>{children}</ProjectShell>
    </ProjectContext.Provider>
  )
}

function NotLockedYet({ name }: { name: string }) {
  return (
    <div className="space-y-2 py-16 text-center">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Portfolio
      </Link>
      <h1 className="text-xl font-semibold">{name}</h1>
      <p className="text-muted-foreground">{`${name}’s scope isn’t locked yet.`}</p>
      <Link href="/projects/new" className="underline">
        Open the wizard
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Implement the Overview view and the test helper**

Create `src/components/project/overview-view.tsx`:

```tsx
'use client'

import { toProjectOverview } from '@/lib/data/view-models'
import { OverviewContent } from './overview-content'
import { useProject } from './project-data-provider'

export function OverviewView() {
  const { data, now } = useProject()
  return <OverviewContent overview={toProjectOverview(data)} now={now} />
}
```

Create `src/components/project/test-utils.tsx` (used by the screen tests in later tasks):

```tsx
import { render } from '@testing-library/react'
import type { ProjectData } from '@/lib/domain/types'
import { ProjectDataProvider } from './project-data-provider'

export const NOW = '2026-10-16T09:00:00+02:00'

/** Renders a screen inside the project provider, the way the project layout does. */
export function renderProject(ui: React.ReactElement, data: ProjectData) {
  return render(
    <ProjectDataProvider source={{ kind: 'project', data }} now={NOW}>
      {ui}
    </ProjectDataProvider>,
  )
}
```

- [ ] **Step 5: Wire the layout and the Overview page**

Replace `src/app/projects/[projectId]/layout.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import { ProjectDataProvider } from '@/components/project/project-data-provider'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repo = getRepository()
  const now = getNow()

  const data = await repo.getProjectData(projectId)
  if (data) {
    return (
      <ProjectDataProvider source={{ kind: 'project', data }} now={now}>
        {children}
      </ProjectDataProvider>
    )
  }

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return (
    <ProjectDataProvider source={{ kind: 'draft', draft }} now={now}>
      {children}
    </ProjectDataProvider>
  )
}
```

Replace `src/app/projects/[projectId]/page.tsx` with:

```tsx
import { OverviewView } from '@/components/project/overview-view'

export default function ProjectOverviewPage() {
  return <OverviewView />
}
```

- [ ] **Step 6: Remove the draft-only components**

```bash
git rm src/components/project/draft-project-layout.tsx src/components/project/draft-overview.tsx src/components/project/draft-project.test.tsx
```

- [ ] **Step 7: Run the tests and typecheck**

Run: `npx vitest run src/components/project && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/project src/app/projects
git commit -m "feat: merge browser decisions into project pages through one provider"
```

---

### Task 14: Portfolio applies every project's decisions

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/portfolio/portfolio-view.tsx`
- Test: `src/components/portfolio/portfolio-view.test.tsx`

- [ ] **Step 1: Rewrite the tests (they will fail)**

Replace `src/components/portfolio/portfolio-view.test.tsx` with:

```tsx
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { expenseTracker } from '@/lib/mock/project-a'
import { PortfolioView } from './portfolio-view'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const V2 = draft.brief.projectId
const A = expenseTracker.project.id

const rowOf = (name: string) => {
  const row = screen.getByRole('link', { name }).closest('tr')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}

describe('PortfolioView', () => {
  beforeEach(() => {
    store.reset(V2)
    store.reset(A)
  })

  it('shows only mock projects while Intelligent Flow v2 is not locked', () => {
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    expect(screen.getByText('1 project')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Intelligent Flow v2' })).not.toBeInTheDocument()
  })

  it('adds Intelligent Flow v2 at 0% once v1 is locked', () => {
    store.decideAll(V2, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(V2, NOW, 'Demo approver')
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    expect(screen.getByText('2 projects')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intelligent Flow v2' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(rowOf('Intelligent Flow v2').getByText('Completion 0% · Delivery 0%')).toBeInTheDocument()
    expect(rowOf('Intelligent Flow v2').getByText('0 / 28')).toBeInTheDocument()
  })

  it('applies stored decisions to mock projects', () => {
    store.decideScr(A, 'SCR-1', { status: 'approved', decidedAt: NOW, decidedBy: 'Maya Patel', reason: 'Yes' })
    render(<PortfolioView projects={[expenseTracker]} draft={draft} now={NOW} />)
    const row = rowOf('Expense tracker')
    expect(row.getByRole('cell', { name: 'v1.1' })).toBeInTheDocument()
    expect(row.getByText('6 / 20')).toBeInTheDocument()
    expect(row.getByText('Completion 30% · Delivery 40%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/portfolio/portfolio-view.test.tsx`
Expected: FAIL (type error / `projects` prop not used; rows prop missing).

- [ ] **Step 3: Implement**

Replace `src/components/portfolio/portfolio-view.tsx` with:

```tsx
'use client'

import { useMemo } from 'react'
import { toPortfolioRow } from '@/lib/data/view-models'
import { useAllDecisions } from '@/lib/decisions/use-decisions'
import { EMPTY_DECISIONS, type PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { applyProjectDecisions } from '@/lib/progress/applyProjectDecisions'
import { PortfolioTotals } from './portfolio-totals'
import { ProjectsTable } from './projects-table'

/** Mock projects plus the wizard project once its v1 is locked, each merged with this browser's decisions. */
export function PortfolioView({ projects, draft, now }: { projects: ProjectData[]; draft: PlannerDraft | null; now: IsoDateTime }) {
  const all = useAllDecisions()
  const rows = useMemo(() => {
    const decisionsOf = (id: string) => all[id] ?? EMPTY_DECISIONS
    const merged = projects.map((p) => applyProjectDecisions(p, decisionsOf(p.project.id), now))
    const draftData = draft ? applyDecisions(draft, decisionsOf(draft.brief.projectId)) : null
    if (draftData) merged.push(applyProjectDecisions(draftData, decisionsOf(draftData.project.id), now))
    return merged.map(toPortfolioRow)
  }, [projects, draft, all, now])

  return (
    <>
      <PortfolioTotals rows={rows} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{`${rows.length} ${rows.length === 1 ? 'project' : 'projects'}`}</p>
        <ProjectsTable rows={rows} now={now} />
      </div>
    </>
  )
}
```

In `src/app/page.tsx`, replace the `Promise.all` line with:

```tsx
  const [projects, draft] = await Promise.all([repo.getAllProjectData(), repo.getPlannerDraft(WIZARD_PROJECT_ID)])
```

and the `PortfolioView` line with:

```tsx
      <PortfolioView projects={projects} draft={draft} now={getNow()} />
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/components/portfolio && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/portfolio
git commit -m "feat: apply browser decisions to every project on the Portfolio"
```

---

### Task 15: Remove the old repository view methods

**Files:**
- Modify: `src/lib/data/repository.ts`, `src/lib/data/mock-repository.ts`
- Test: `src/lib/data/mock-repository.test.ts`, `src/lib/data/view-models.test.ts`

- [ ] **Step 1: Check nothing uses them any more**

Run: `git grep -n "getPortfolio\|getProjectHeader\|getProjectOverview" -- src e2e`
Expected: matches only in `src/lib/data/repository.ts`, `mock-repository.ts` and `mock-repository.test.ts`.

- [ ] **Step 2: Move the warning-order test to the view models**

Append inside the `describe('view models', …)` block of `src/lib/data/view-models.test.ts`:

```ts
  it('orders warnings by severity, then oldest first, and keeps five', () => {
    const base = customerPortal
    const warning = (id: string, severity: 'high' | 'medium' | 'low', raisedAt: string) => ({ ...base.warnings[0], id, severity, raisedAt })
    const custom = {
      ...base,
      warnings: [
        warning('S1', 'low', '2026-10-10T09:00:00+02:00'), warning('S2', 'medium', '2026-10-12T09:00:00+02:00'),
        warning('S3', 'medium', '2026-10-11T09:00:00+02:00'), warning('S4', 'high', '2026-10-13T09:00:00+02:00'),
        warning('S5', 'low', '2026-10-09T09:00:00+02:00'), warning('S6', 'low', '2026-10-08T09:00:00+02:00'),
      ],
    }
    expect(toProjectOverview(custom).topWarnings.map((s) => s.id)).toEqual(['S4', 'S3', 'S2', 'S6', 'S5'])
  })
```

- [ ] **Step 3: Rewrite the repository test**

Replace `src/lib/data/mock-repository.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_PROJECTS } from '@/lib/mock'
import { ALL_DRAFTS } from '@/lib/mock/planner'
import { createMockRepository } from './mock-repository'

const repo = createMockRepository(ALL_PROJECTS, ALL_DRAFTS)

describe('MockRepository.getProjectData', () => {
  it('returns a project’s raw data, or null for drafts and unknown ids', async () => {
    expect((await repo.getProjectData('customer-portal'))?.project.name).toBe('Customer portal')
    expect(await repo.getProjectData('intelligent-flow-v2')).toBeNull()
    expect(await repo.getProjectData('nope')).toBeNull()
  })

  it('lists every project, without drafts', async () => {
    expect((await repo.getAllProjectData()).map((d) => d.project.id)).toEqual(['expense-tracker', 'customer-portal', 'intelligent-flow'])
  })
})

describe('MockRepository.getPlannerDraft', () => {
  it('returns the Intelligent Flow v2 draft, or null for any other id', async () => {
    const draft = await repo.getPlannerDraft('intelligent-flow-v2')
    expect(draft?.brief.name).toBe('Intelligent Flow v2')
    expect(await repo.getPlannerDraft('intelligent-flow')).toBeNull()
    expect(await repo.getPlannerDraft('nope')).toBeNull()
  })
})
```

- [ ] **Step 4: Remove the methods**

In `src/lib/data/repository.ts`, replace the `PulseRepository` interface with:

```ts
/** The only way the UI reads data. Swap the implementation for a real DB later. */
export interface PulseRepository {
  /** Raw facts for one project; screens merge browser decisions on top. Null for unknown ids and drafts. */
  getProjectData(projectId: string): Promise<ProjectData | null>
  getAllProjectData(): Promise<ProjectData[]>
  /** Read-only planner output for a project that is being created (the wizard). */
  getPlannerDraft(projectId: string): Promise<PlannerDraft | null>
}
```

Replace `src/lib/data/mock-repository.ts` with:

```ts
import type { PlannerDraft } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'
import type { PulseRepository } from './repository'

export function createMockRepository(projects: ProjectData[], drafts: PlannerDraft[] = []): PulseRepository {
  return {
    async getProjectData(projectId) {
      return projects.find((d) => d.project.id === projectId) ?? null
    },

    async getAllProjectData() {
      return projects
    },

    async getPlannerDraft(projectId) {
      return drafts.find((d) => d.brief.projectId === projectId) ?? null
    },
  }
}
```

- [ ] **Step 5: Run everything**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data
git commit -m "refactor: drop server-built view methods from the repository"
```

---

### Task 16: Sidebar links to every tab, with a demo reset

**Files:**
- Modify: `src/components/project/project-sidebar.tsx`
- Test: `src/components/project/project-header.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/components/project/project-header.test.tsx`:

Change the first two import lines to:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
```

Add directly below the imports:

```tsx
vi.mock('next/navigation', () => ({ usePathname: () => '/projects/customer-portal/scope' }))
```

Replace the `describe('ProjectSidebar', …)` block with:

```tsx
describe('ProjectSidebar', () => {
  it('links all eight screens and marks the current one', () => {
    render(<ProjectSidebar projectId="customer-portal" />)
    const names = ['Overview', 'User testing', 'Scope', 'Tasks', 'Evidence', 'Approvals', 'Changelog', 'Metrics']
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(names)
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/customer-portal')
    expect(screen.getByRole('link', { name: 'User testing' })).toHaveAttribute('href', '/projects/customer-portal/user-testing')
    expect(screen.getByRole('link', { name: 'Scope' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('soon')).not.toBeInTheDocument()
  })

  it('resets the project’s demo decisions', () => {
    const store = getDecisionStore()
    store.decideScr('customer-portal', 'SCR-2', { status: 'rejected', decidedAt: '2026-10-16T09:00:00+02:00', decidedBy: 'Lena Fischer', reason: 'No' })
    render(<ProjectSidebar projectId="customer-portal" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo decisions' }))
    expect(store.get('customer-portal').scrs).toBeUndefined()
  })

  it('has no reset for the wizard project, which resets from the wizard', () => {
    render(<ProjectSidebar projectId="intelligent-flow-v2" />)
    expect(screen.queryByRole('button', { name: 'Reset demo decisions' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/project-header.test.tsx`
Expected: FAIL. Only one link is found and `soon` is present.

- [ ] **Step 3: Implement**

Replace `src/components/project/project-sidebar.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'
import { cn } from '@/lib/utils'

// README §5 project screens, in sidebar order.
const SCREENS = [
  { label: 'Overview', path: '' },
  { label: 'User testing', path: '/user-testing' },
  { label: 'Scope', path: '/scope' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Evidence', path: '/evidence' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Changelog', path: '/changelog' },
  { label: 'Metrics', path: '/metrics' },
] as const

export function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <nav aria-label="Project" className="flex flex-col gap-1 text-sm">
      {SCREENS.map(({ label, path }) => {
        const href = `${base}${path}`
        const current = pathname === href
        return (
          <Link
            key={label}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn('rounded-md px-3 py-2', current ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
          >
            {label}
          </Link>
        )
      })}
      {/* The wizard project's decisions are reset from the wizard, which also clears its v1 lock. */}
      {projectId !== WIZARD_PROJECT_ID && (
        <button
          type="button"
          onClick={() => getDecisionStore().reset(projectId)}
          className="mt-4 rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:underline"
        >
          Reset demo decisions
        </button>
      )}
    </nav>
  )
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project`
Expected: PASS. (`project-data-provider.test.tsx` still finds the Overview link: `usePathname` returns null outside the Next router, so nothing is marked current there.)

- [ ] **Step 5: Commit**

```bash
git add src/components/project/project-sidebar.tsx src/components/project/project-header.test.tsx
git commit -m "feat: link every project tab and add a demo reset"
```

---

### Task 17: Form primitives and shared screen components

**Files:**
- Create (shadcn): `src/components/ui/input.tsx`, `textarea.tsx`, `label.tsx`
- Create: `src/components/human-test-mark.tsx`, `src/components/project/ac-state-badge.tsx`, `src/components/project/scope-diff-list.tsx`, `src/components/project/screen-heading.tsx`
- Modify: `src/components/labels.ts`
- Test: `src/components/project/scope-diff-list.test.tsx`

- [ ] **Step 1: Add the shadcn primitives**

Run: `npx shadcn@latest add input textarea label`
Expected: creates `src/components/ui/input.tsx`, `textarea.tsx` and `label.tsx` (base-nova style). If it asks to overwrite anything, answer no.

If the CLI can't reach the registry, create them by hand instead:

`src/components/ui/input.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
```

`src/components/ui/textarea.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
```

`src/components/ui/label.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('flex items-center gap-2 text-sm font-medium leading-none select-none', className)} {...props} />
}

export { Label }
```

- [ ] **Step 2: Write the failing test**

Create `src/components/project/scope-diff-list.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScopeDiffList } from './scope-diff-list'

describe('ScopeDiffList', () => {
  it('shows each change with its kind for screen readers', () => {
    render(
      <ScopeDiffList
        entries={[
          { kind: 'added', level: 'ac', id: 'AC-5.1.1', text: 'Exporting a month downloads a CSV' },
          { kind: 'changed', level: 'ac', id: 'AC-1.1.2', text: 'New text', before: 'Old text' },
          { kind: 'removed', level: 'story', id: 'US-4.2', text: 'Chat with support' },
        ]}
      />,
    )
    // The +/~/− sign is aria-hidden; the second span holds what a screen reader announces.
    const items = screen.getAllByRole('listitem').map((li) => li.lastElementChild?.textContent)
    expect(items).toEqual(['Added: AC AC-5.1.1 Exporting a month downloads a CSV', 'Changed: AC AC-1.1.2 Old text → New text', 'Removed: Story US-4.2 Chat with support'])
  })

  it('says when there are no changes', () => {
    render(<ScopeDiffList entries={[]} />)
    expect(screen.getByText('No changes.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to make sure it fails**

Run: `npx vitest run src/components/project/scope-diff-list.test.tsx`
Expected: FAIL. Cannot find module `./scope-diff-list`.

- [ ] **Step 4: Implement the shared components**

Create `src/components/human-test-mark.tsx`:

```tsx
/** The 👤 marker for ACs that need a human tester (same as the wizard's). */
export function HumanTestMark() {
  return (
    <span role="img" aria-label="Needs a human tester" title="Needs a human tester">
      {' 👤'}
    </span>
  )
}
```

Create `src/components/project/ac-state-badge.tsx`:

```tsx
import { AC_STATE_COLOR, AC_STATE_LABEL } from '@/components/labels'
import type { AcState } from '@/lib/domain/types'

export function AcStateBadge({ state }: { state: AcState }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${AC_STATE_COLOR[state]}`} />
      {AC_STATE_LABEL[state]}
    </span>
  )
}
```

Create `src/components/project/scope-diff-list.tsx`:

```tsx
import type { DiffKind, DiffLevel, ScopeDiffEntry } from '@/lib/progress/diffScopes'

const MARK: Record<DiffKind, { sign: string; label: string; className: string }> = {
  added: { sign: '+', label: 'Added', className: 'text-(--ac-verified)' },
  changed: { sign: '~', label: 'Changed', className: 'text-(--ac-implemented)' },
  removed: { sign: '−', label: 'Removed', className: 'text-(--ac-failing)' },
}

const LEVEL: Record<DiffLevel, string> = { feature: 'Feature', story: 'Story', ac: 'AC' }

/** A scope diff, used by Scope (compare), Approvals (impact) and Changelog. */
export function ScopeDiffList({ entries }: { entries: ScopeDiffEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No changes.</p>
  return (
    <ul className="space-y-1 text-sm">
      {entries.map((e) => {
        const mark = MARK[e.kind]
        return (
          <li key={`${e.kind}-${e.level}-${e.id}`} className="flex gap-2">
            <span aria-hidden className={`w-3 shrink-0 font-mono font-semibold ${mark.className}`}>
              {mark.sign}
            </span>
            <span>
              <span className="sr-only">{`${mark.label}: `}</span>
              <span className="font-medium">{`${LEVEL[e.level]} ${e.id}`}</span>{' '}
              {e.kind === 'changed' && e.before !== undefined ? (
                <>
                  <s className="text-muted-foreground">{e.before}</s>
                  {' → '}
                  {e.text}
                </>
              ) : (
                e.text
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

Create `src/components/project/screen-heading.tsx`:

```tsx
/** The h2 at the top of each project tab (the project name is the page's h1). */
export function ScreenHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
```

- [ ] **Step 5: Add labels**

In `src/components/labels.ts`, change the import to:

```ts
import type { AcState, BoardKind, CiStatus, ProjectKind, ScopeChangeRequest, Severity, TestPlanMark } from '@/lib/domain/types'
import type { TaskStatus } from '@/lib/progress/taskStatus'
```

and append:

```ts
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}

export const CI_LABEL: Record<CiStatus, string> = { passing: 'CI passing', failing: 'CI failing', pending: 'CI pending', none: 'No CI' }

export const MARK_LABEL: Record<TestPlanMark, string> = { ticked: 'Ticked', unticked: 'Unticked', failed: 'Reported failing' }

/** "Agent · PR #5", "Pulse", "Human" */
export function scrSourceLabel({ source, prNumber }: Pick<ScopeChangeRequest, 'source' | 'prNumber'>): string {
  if (source === 'agent_pr') return prNumber !== undefined ? `Agent · PR #${prNumber}` : 'Agent'
  return source === 'pulse' ? 'Pulse' : 'Human'
}
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `npx vitest run src/components && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui src/components/human-test-mark.tsx src/components/project/ac-state-badge.tsx src/components/project/scope-diff-list.tsx src/components/project/scope-diff-list.test.tsx src/components/project/screen-heading.tsx src/components/labels.ts components.json package.json package-lock.json
git commit -m "feat: add form primitives and shared components for the project tabs"
```

(Only add `components.json` / `package*.json` if the shadcn CLI changed them; `git status` shows it.)

---

### Task 18: User testing screen

**Files:**
- Create: `src/components/project/user-testing/user-testing-view.tsx`, `src/components/project/user-testing/record-result-form.tsx`
- Create: `src/app/projects/[projectId]/user-testing/page.tsx`
- Test: `src/components/project/user-testing/user-testing-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/user-testing/user-testing-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlow } from '@/lib/mock/project-c'
import { renderProject } from '../test-utils'
import { UserTestingView } from './user-testing-view'

const store = getDecisionStore()
const C = intelligentFlow.project.id
const queue = () => within(screen.getByRole('region', { name: /Waiting for a tester/ }))

describe('UserTestingView', () => {
  beforeEach(() => store.reset(C))

  it('lists the waiting 👤 ACs, oldest first', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    expect(screen.getByRole('heading', { level: 2, name: 'User testing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waiting for a tester (3)' })).toBeInTheDocument()
    expect(queue().getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent?.slice(0, 8))).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
    expect(queue().getByText('Story US-3.1 · T-14 · PR #206 merged 25 Sep · waiting 20 d')).toBeInTheDocument()
  })

  it('needs a result, an environment and a tester', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    fireEvent.click(screen.getByRole('button', { name: 'Record result for AC-3.1.5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose pass or fail.Enter the environment.Enter the tester’s name.')
    expect(store.get(C).humanTests).toBeUndefined()
  })

  it('saves a pass: the AC leaves the queue and appears in the recorded results', () => {
    renderProject(<UserTestingView />, intelligentFlow)
    fireEvent.click(screen.getByRole('button', { name: 'Record result for AC-3.1.5' }))
    const form = within(screen.getByRole('form', { name: 'Record result for AC-3.1.5' }))
    fireEvent.click(form.getByLabelText('Pass'))
    fireEvent.change(form.getByLabelText('Environment'), { target: { value: 'Staging' } })
    fireEvent.change(form.getByLabelText('Tester'), { target: { value: 'Demo tester' } })
    fireEvent.click(form.getByRole('button', { name: 'Save result' }))

    expect(screen.getByRole('heading', { name: 'Waiting for a tester (2)' })).toBeInTheDocument()
    const results = within(screen.getByRole('table'))
    expect(results.getByRole('cell', { name: 'AC-3.1.5' })).toBeInTheDocument()
    expect(results.getByRole('cell', { name: 'Pass' })).toBeInTheDocument()
    expect(store.get(C).humanTests).toEqual([{ acId: 'AC-3.1.5', result: 'pass', environment: 'Staging', tester: 'Demo tester', testedAt: '2026-10-16T09:00:00+02:00' }])
  })

  it('says when nothing is waiting', () => {
    renderProject(<UserTestingView />, { ...intelligentFlow, prs: [] })
    expect(screen.getByText('No ACs are waiting for a tester.')).toBeInTheDocument()
    expect(screen.getByText('No results recorded yet.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/user-testing`
Expected: FAIL. Cannot find module `./user-testing-view`.

- [ ] **Step 3: Implement the form**

Create `src/components/project/user-testing/record-result-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import type { IsoDateTime } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'

interface Props {
  projectId: string
  acId: string
  now: IsoDateTime
  defaultEnvironment: string
  onDone: () => void
}

export function RecordResultForm({ projectId, acId, now, defaultEnvironment, onDone }: Props) {
  const [result, setResult] = useState<'pass' | 'fail' | null>(null)
  const [environment, setEnvironment] = useState(defaultEnvironment)
  const [tester, setTester] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const id = (field: string) => `${acId}-${field}`

  function save() {
    const missing = [
      ...(result ? [] : ['Choose pass or fail.']),
      ...(environment.trim() ? [] : ['Enter the environment.']),
      ...(tester.trim() ? [] : ['Enter the tester’s name.']),
    ]
    setErrors(missing)
    if (!result || missing.length > 0) return
    getDecisionStore().recordHumanTest(projectId, {
      acId,
      result,
      environment: environment.trim(),
      tester: tester.trim(),
      testedAt: now,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
    onDone()
  }

  return (
    <form
      aria-label={`Record result for ${acId}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="space-y-3 rounded-lg border p-3"
    >
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Result</legend>
        <div className="flex gap-4">
          {(['pass', 'fail'] as const).map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name={id('result')} value={r} checked={result === r} onChange={() => setResult(r)} />
              {r === 'pass' ? 'Pass' : 'Fail'}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={id('environment')}>Environment</Label>
          <Input id={id('environment')} value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="e.g. a staging URL" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('tester')}>Tester</Label>
          <Input id={id('tester')} value={tester} onChange={(e) => setTester(e.target.value)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{`Date: ${formatDate(now)}`}</p>
      <div className="space-y-1">
        <Label htmlFor={id('notes')}>Notes (optional)</Label>
        <Textarea id={id('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Devices, screenshot link…" />
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save}>
          Save result
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Implement the view**

Create `src/components/project/user-testing/user-testing-view.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDuration } from '@/lib/format'
import { userTestingQueue } from '@/lib/progress/userTesting'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'
import { RecordResultForm } from './record-result-form'

export function UserTestingView() {
  const { data, acStates, now } = useProject()
  const [open, setOpen] = useState<string | null>(null)
  const queue = userTestingQueue(data, acStates)
  const results = [...data.humanTests].sort((a, b) => Date.parse(b.testedAt) - Date.parse(a.testedAt))
  const lastEnvironment = results[0]?.environment ?? ''

  return (
    <div className="space-y-6">
      <ScreenHeading title="User testing" description="👤 ACs whose code is merged and that wait for a human result." />

      <section aria-labelledby="queue-heading" className="space-y-3">
        <h3 id="queue-heading" className="font-medium">{`Waiting for a tester (${queue.length})`}</h3>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ACs are waiting for a tester.</p>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => {
              const delivered = [item.taskId, item.prNumber !== undefined ? `PR #${item.prNumber} merged ${item.mergedAt ? formatDate(item.mergedAt) : ''}` : undefined]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={item.ac.id}>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">{item.ac.id}</span> {item.ac.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[`Story ${item.storyId}`, delivered, `waiting ${formatDuration(item.waitingSince, now)}`].filter(Boolean).join(' · ')}
                      </p>
                      {open === item.ac.id ? (
                        <RecordResultForm projectId={data.project.id} acId={item.ac.id} now={now} defaultEnvironment={lastEnvironment} onDone={() => setOpen(null)} />
                      ) : (
                        <Button size="sm" variant="outline" aria-label={`Record result for ${item.ac.id}`} onClick={() => setOpen(item.ac.id)}>
                          Record result
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="results-heading" className="space-y-3">
        <h3 id="results-heading" className="font-medium">Recorded results</h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>AC</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Tester</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={`${r.acId}-${r.testedAt}-${i}`}>
                  <TableCell>{formatDate(r.testedAt)}</TableCell>
                  <TableCell>{r.acId}</TableCell>
                  <TableCell>{r.result === 'pass' ? 'Pass' : 'Fail'}</TableCell>
                  <TableCell>{r.environment}</TableCell>
                  <TableCell>{r.tester}</TableCell>
                  <TableCell className="text-muted-foreground">{r.notes ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
```

(`waiting 20 d` in the test: 25 Sep 17:00 → 16 Oct 09:00 is 20 days 16 hours; `formatDuration` floors to days.)

- [ ] **Step 5: Add the route**

Create `src/app/projects/[projectId]/user-testing/page.tsx`:

```tsx
import { UserTestingView } from '@/components/project/user-testing/user-testing-view'

export default function UserTestingPage() {
  return <UserTestingView />
}
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/user-testing && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/project/user-testing "src/app/projects/[projectId]/user-testing"
git commit -m "feat: add the User testing screen"
```

---

### Task 19: Approvals screen

**Files:**
- Create: `src/components/project/approvals/approvals-view.tsx`, `scr-card.tsx`, `decide-scr-form.tsx`
- Create: `src/app/projects/[projectId]/approvals/page.tsx`
- Test: `src/components/project/approvals/approvals-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/approvals/approvals-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { expenseTracker } from '@/lib/mock/project-a'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { ApprovalsView } from './approvals-view'

const store = getDecisionStore()
const card = (id: string) => within(screen.getByRole('article', { name: new RegExp(`^${id} · `) }))

describe('ApprovalsView', () => {
  beforeEach(() => {
    store.reset(expenseTracker.project.id)
    store.reset(customerPortal.project.id)
  })

  it('shows a pending SCR with its impact', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    expect(screen.getByRole('heading', { level: 2, name: 'Approvals' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waiting for a decision (1)' })).toBeInTheDocument()
    const scr = card('SCR-1')
    expect(scr.getByText('Agent · PR #5 · raised 13 Oct · waiting 2 d')).toBeInTheDocument()
    expect(scr.getByText('Touches: Export')).toBeInTheDocument()
    expect(scr.getByText('Completion 35% → 30%')).toBeInTheDocument()
    expect(scr.getByText('New tasks: T-08 CSV export')).toBeInTheDocument()
    expect(scr.getAllByRole('listitem')).toHaveLength(5)
  })

  it('needs an approver and a reason', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    const scr = card('SCR-1')
    fireEvent.change(scr.getByLabelText('Approver'), { target: { value: ' ' } })
    fireEvent.click(scr.getByRole('button', { name: 'Approve SCR-1' }))
    expect(scr.getByRole('alert')).toHaveTextContent('Enter the approver’s name.Enter a reason.')
    expect(store.get(expenseTracker.project.id).scrs).toBeUndefined()
  })

  it('approving creates v1.1 and moves the card to Decided', () => {
    renderProject(<ApprovalsView />, expenseTracker)
    const scr = card('SCR-1')
    expect(scr.getByLabelText('Approver')).toHaveValue('Maya Patel')
    fireEvent.change(scr.getByLabelText('Reason'), { target: { value: 'Accountants need it' } })
    fireEvent.click(scr.getByRole('button', { name: 'Approve SCR-1' }))

    expect(screen.getByText('Nothing waiting for approval.')).toBeInTheDocument()
    const decided = card('SCR-1')
    expect(decided.getByText('Approved by Maya Patel on 16 Oct · created v1.1')).toBeInTheDocument()
    expect(decided.getByText('Reason: Accountants need it')).toBeInTheDocument()
    expect(decided.getByRole('link', { name: 'Compare v1 → v1.1' })).toHaveAttribute('href', '/projects/expense-tracker/scope?from=v1&to=v1.1')
    expect(screen.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeInTheDocument()
  })

  it('shows decided SCRs from the mocks, newest first', () => {
    renderProject(<ApprovalsView />, customerPortal)
    expect(screen.getByRole('heading', { name: 'Decided (2)' })).toBeInTheDocument()
    expect(card('SCR-1').getByText('Approved by Lena Fischer on 6 Oct · created v1.1')).toBeInTheDocument()
    expect(card('SCR-3').getByText('Rejected by Lena Fischer on 3 Oct')).toBeInTheDocument()
    expect(card('SCR-3').getByText('Reason: Not in this release: support answers by email only.')).toBeInTheDocument()
    const titles = screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))
    expect(titles).toEqual(['SCR-2-title', 'SCR-1-title', 'SCR-3-title'])
  })

  it('rejecting keeps the scope version', () => {
    renderProject(<ApprovalsView />, customerPortal)
    const scr = card('SCR-2')
    expect(scr.getByText('Pulse · raised 14 Oct · waiting 2 d')).toBeInTheDocument()
    fireEvent.change(scr.getByLabelText('Reason'), { target: { value: 'Not now' } })
    fireEvent.click(scr.getByRole('button', { name: 'Reject SCR-2' }))
    expect(card('SCR-2').getByText('Rejected by Lena Fischer on 16 Oct')).toBeInTheDocument()
    expect(screen.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/approvals`
Expected: FAIL. Cannot find module `./approvals-view`.

- [ ] **Step 3: Implement the decision form**

Create `src/components/project/approvals/decide-scr-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import type { ScrDecision } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'

interface Props {
  projectId: string
  scrId: string
  defaultApprover: string
  now: IsoDateTime
}

export function DecideScrForm({ projectId, scrId, defaultApprover, now }: Props) {
  const [approver, setApprover] = useState(defaultApprover)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  function decide(status: ScrDecision['status']) {
    const missing = [...(approver.trim() ? [] : ['Enter the approver’s name.']), ...(reason.trim() ? [] : ['Enter a reason.'])]
    setErrors(missing)
    if (missing.length > 0) return
    getDecisionStore().decideScr(projectId, scrId, { status, decidedAt: now, decidedBy: approver.trim(), reason: reason.trim() })
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor={`${scrId}-approver`}>Approver</Label>
          <Input id={`${scrId}-approver`} value={approver} onChange={(e) => setApprover(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${scrId}-reason`}>Reason</Label>
          <Textarea id={`${scrId}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" aria-label={`Approve ${scrId}`} onClick={() => decide('approved')}>
          Approve
        </Button>
        <Button size="sm" variant="outline" aria-label={`Reject ${scrId}`} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
    </div>
  )
}
```

The error list is outside the diff list, so `getAllByRole('listitem')` in the impact test only counts diff entries while no errors show.

- [ ] **Step 4: Implement the card**

Create `src/components/project/approvals/scr-card.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { scrSourceLabel } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import type { IsoDateTime, ProjectData, ScopeChangeRequest } from '@/lib/domain/types'
import { formatDate, formatDuration } from '@/lib/format'
import { scrImpact } from '@/lib/progress/scrImpact'
import { ScopeDiffList } from '../scope-diff-list'
import { DecideScrForm } from './decide-scr-form'

export function ScrCard({ scr, data, now, defaultApprover }: { scr: ScopeChangeRequest; data: ProjectData; now: IsoDateTime; defaultApprover: string }) {
  const titleId = `${scr.id}-title`
  const meta = [scrSourceLabel(scr), `raised ${formatDate(scr.raisedAt)}`, ...(scr.status === 'pending' ? [`waiting ${formatDuration(scr.raisedAt, now)}`] : [])]

  return (
    <article aria-labelledby={titleId}>
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h4 id={titleId} className="font-medium">{`${scr.id} · ${scr.title}`}</h4>
            <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
            {scr.rationale && <p className="text-sm">{scr.rationale}</p>}
          </div>
          {scr.status === 'pending' ? (
            <>
              <Impact data={data} scr={scr} />
              <DecideScrForm projectId={data.project.id} scrId={scr.id} defaultApprover={defaultApprover} now={now} />
            </>
          ) : (
            <Decision data={data} scr={scr} />
          )}
        </CardContent>
      </Card>
    </article>
  )
}

function Impact({ data, scr }: { data: ProjectData; scr: ScopeChangeRequest }) {
  const impact = scrImpact(data, scr)
  if (!impact) return <p className="text-sm text-muted-foreground">No proposed change attached.</p>
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="text-sm font-medium">Impact</p>
      <p className="text-sm">{`Touches: ${impact.features.join(', ')}`}</p>
      <ScopeDiffList entries={impact.diff} />
      <p className="text-sm">{`New tasks: ${impact.tasks.length > 0 ? impact.tasks.map((t) => `${t.id} ${t.title}`).join(', ') : 'none'}`}</p>
      <p className="text-sm">{`Completion ${impact.completionBefore}% → ${impact.completionAfter}%`}</p>
    </div>
  )
}

function Decision({ data, scr }: { data: ProjectData; scr: ScopeChangeRequest }) {
  const versions = data.project.scopeVersions
  const index = versions.findIndex((v) => v.changedBy === scr.id)
  const created = index > 0 ? { from: versions[index - 1].label, to: versions[index].label } : null
  const verb = scr.status === 'approved' ? 'Approved' : 'Rejected'
  const when = scr.decidedAt ? ` on ${formatDate(scr.decidedAt)}` : ''

  return (
    <div className="space-y-1 border-t pt-3 text-sm">
      <p className="font-medium">{`${verb} by ${scr.decidedBy ?? 'unknown'}${when}${created ? ` · created ${created.to}` : ''}`}</p>
      {scr.decisionReason && <p>{`Reason: ${scr.decisionReason}`}</p>}
      {created && (
        <Link href={`/projects/${data.project.id}/scope?from=${created.from}&to=${created.to}`} className="underline">
          {`Compare ${created.from} → ${created.to}`}
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Implement the view**

Create `src/components/project/approvals/approvals-view.tsx`:

```tsx
'use client'

import { currentScope } from '@/lib/domain/scope'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'
import { ScrCard } from './scr-card'

export function ApprovalsView() {
  const { data, now } = useProject()
  const approver = currentScope(data.project).approvedBy
  const pending = data.scrs.filter((s) => s.status === 'pending').sort((a, b) => Date.parse(a.raisedAt) - Date.parse(b.raisedAt))
  const decided = data.scrs
    .filter((s) => s.status !== 'pending')
    .sort((a, b) => Date.parse(b.decidedAt ?? b.raisedAt) - Date.parse(a.decidedAt ?? a.raisedAt))

  return (
    <div className="space-y-6">
      <ScreenHeading title="Approvals" description="Scope change requests. Approving one creates the next scope version." />
      <section aria-labelledby="pending-heading" className="space-y-3">
        <h3 id="pending-heading" className="font-medium">{`Waiting for a decision (${pending.length})`}</h3>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for approval.</p>}
        {pending.map((scr) => (
          <ScrCard key={scr.id} scr={scr} data={data} now={now} defaultApprover={approver} />
        ))}
      </section>
      {decided.length > 0 && (
        <section aria-labelledby="decided-heading" className="space-y-3">
          <h3 id="decided-heading" className="font-medium">{`Decided (${decided.length})`}</h3>
          {decided.map((scr) => (
            <ScrCard key={scr.id} scr={scr} data={data} now={now} defaultApprover={approver} />
          ))}
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Add the route**

Create `src/app/projects/[projectId]/approvals/page.tsx`:

```tsx
import { ApprovalsView } from '@/components/project/approvals/approvals-view'

export default function ApprovalsPage() {
  return <ApprovalsView />
}
```

- [ ] **Step 7: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/approvals && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/project/approvals "src/app/projects/[projectId]/approvals"
git commit -m "feat: add the Approvals screen"
```

---

### Task 20: Scope screen

**Files:**
- Create: `src/components/project/scope/scope-view.tsx`
- Create: `src/app/projects/[projectId]/scope/page.tsx`
- Test: `src/components/project/scope/scope-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/scope/scope-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { ScopeView } from './scope-view'

describe('ScopeView', () => {
  beforeEach(() => getDecisionStore().reset(customerPortal.project.id))

  it('shows the current version as a tree with AC states', () => {
    renderProject(<ScopeView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Scope' })).toBeInTheDocument()
    expect(screen.getByLabelText('Version')).toHaveValue('v1.1')
    expect(screen.getByText('Locked 6 Oct by Lena Fischer · from SCR-1')).toBeInTheDocument()
    expect(screen.getByText('3 of 6 verified')).toBeInTheDocument()
    const ac = screen.getByText('AC-3.1.2').closest('li')
    if (!ac) throw new Error('no AC row')
    expect(within(ac).getByText('Regressed')).toBeInTheDocument()
  })

  it('shows an older version without states', () => {
    renderProject(<ScopeView />, customerPortal)
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: 'v1' } })
    expect(screen.queryByText('AC-3.1.5')).not.toBeInTheDocument()
    expect(screen.queryByText('Regressed')).not.toBeInTheDocument()
    expect(screen.getByText('Locked 22 Sep by Lena Fischer')).toBeInTheDocument()
  })

  it('compares two versions', () => {
    renderProject(<ScopeView />, customerPortal)
    fireEvent.change(screen.getByLabelText('Compare with'), { target: { value: 'v1' } })
    const diff = within(screen.getByRole('region', { name: 'Changes from v1 to v1.1' }))
    expect(diff.getAllByRole('listitem').map((li) => li.lastElementChild?.textContent)).toEqual([
      'Added: AC AC-3.1.5 An invoice can be downloaded as a PDF',
      'Added: AC AC-3.1.6 The PDF matches the invoice shown on screen 👤',
    ])
  })

  it('opens the comparison from the URL', () => {
    renderProject(<ScopeView from="v1" to="v1.1" />, customerPortal)
    expect(screen.getByRole('region', { name: 'Changes from v1 to v1.1' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/scope`
Expected: FAIL. Cannot find module `./scope-view`.

- [ ] **Step 3: Implement**

Create `src/components/project/scope/scope-view.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { HumanTestMark } from '@/components/human-test-mark'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentScope } from '@/lib/domain/scope'
import type { AcState, ScopeVersion } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { diffScopes } from '@/lib/progress/diffScopes'
import { AcStateBadge } from '../ac-state-badge'
import { useProject } from '../project-data-provider'
import { ScopeDiffList } from '../scope-diff-list'
import { ScreenHeading } from '../screen-heading'

const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm dark:bg-input/30'

/** `from` / `to` come from the URL (`?from=v1&to=v1.1`), e.g. links from Approvals and Changelog. */
export function ScopeView({ from, to }: { from?: string; to?: string }) {
  const { data, acStates } = useProject()
  const versions = data.project.scopeVersions
  const labels = versions.map((v) => v.label)
  const current = currentScope(data.project).label

  // Choices stay null until the user picks, so versions created by decisions after hydration still match the URL.
  const [shownChoice, setShown] = useState<string | null>(null)
  const [baseChoice, setBase] = useState<string | null>(null)
  const shown = shownChoice ?? (to && labels.includes(to) ? to : current)
  const baseRaw = baseChoice ?? (from && labels.includes(from) ? from : '')
  const base = baseRaw === shown ? '' : baseRaw

  const version = versions.find((v) => v.label === shown) ?? currentScope(data.project)
  const baseVersion = versions.find((v) => v.label === base)
  const stateById = shown === current ? new Map(acStates.map((s) => [s.acId, s.state])) : null

  return (
    <div className="space-y-6">
      <ScreenHeading title="Scope" description="Features, user stories and acceptance criteria in each locked version." />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="scope-version" className="block text-sm font-medium">
            Version
          </label>
          <select id="scope-version" className={selectClass} value={shown} onChange={(e) => setShown(e.target.value)}>
            {labels.map((l) => (
              <option key={l} value={l}>
                {l === current ? `${l} (current)` : l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="scope-compare" className="block text-sm font-medium">
            Compare with
          </label>
          <select id="scope-compare" className={selectClass} value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Nothing</option>
            {labels
              .filter((l) => l !== shown)
              .map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {`Locked ${formatDate(version.lockedAt)} by ${version.approvedBy}${version.changedBy ? ` · from ${version.changedBy}` : ''}`}
        </p>
      </div>

      {baseVersion && (
        <section aria-labelledby="scope-diff-heading" className="space-y-2 rounded-lg border p-4">
          <h3 id="scope-diff-heading" className="font-medium">{`Changes from ${base} to ${shown}`}</h3>
          <ScopeDiffList entries={diffScopes(baseVersion, version)} />
        </section>
      )}

      <ScopeTree version={version} stateById={stateById} />
    </div>
  )
}

function ScopeTree({ version, stateById }: { version: ScopeVersion; stateById: Map<string, AcState> | null }) {
  return (
    <div className="space-y-4">
      {version.features.map((f) => (
        <Card key={f.id}>
          <CardHeader>
            <CardTitle>
              <h3 className="m-0 text-base font-medium">{`${f.id} ${f.title}`}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {f.stories.map((s) => {
              const verified = s.acs.filter((a) => stateById?.get(a.id) === 'verified').length
              return (
                <div key={s.id} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-medium">{s.id}</span> {s.text}
                    </p>
                    {stateById && <span className="text-xs text-muted-foreground">{`${verified} of ${s.acs.length} verified`}</span>}
                  </div>
                  <ul className="space-y-1 border-l pl-4">
                    {s.acs.map((a) => {
                      const state = stateById?.get(a.id)
                      return (
                        <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span>
                            <span className="font-medium">{a.id}</span> {a.text}
                            {a.humanTest && <HumanTestMark />}
                          </span>
                          {state && <AcStateBadge state={state} />}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Note on the test `getByText('AC-3.1.2')`: the id is its own `<span>`, so the exact match finds it and `closest('li')` is the AC row.

- [ ] **Step 4: Add the route**

Create `src/app/projects/[projectId]/scope/page.tsx`:

```tsx
import { ScopeView } from '@/components/project/scope/scope-view'

export default async function ScopePage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> }) {
  const { from, to } = await searchParams
  return <ScopeView from={typeof from === 'string' ? from : undefined} to={typeof to === 'string' ? to : undefined} />
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/scope && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/scope "src/app/projects/[projectId]/scope"
git commit -m "feat: add the Scope screen with version compare"
```

---

### Task 21: Tasks screen (list and board)

**Files:**
- Create: `src/components/project/tasks/tasks-view.tsx`
- Create: `src/app/projects/[projectId]/tasks/page.tsx`
- Test: `src/components/project/tasks/tasks-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/tasks/tasks-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { expenseTracker } from '@/lib/mock/project-a'
import { renderProject } from '../test-utils'
import { TasksView } from './tasks-view'

const rowOf = (taskId: string) => {
  const row = screen.getByRole('button', { name: new RegExp(`^${taskId} `) }).closest('tr')
  if (!row) throw new Error(`no row for ${taskId}`)
  return within(row)
}

describe('TasksView', () => {
  beforeEach(() => getDecisionStore().reset(expenseTracker.project.id))

  it('lists tasks with status, AC progress, PRs and agent', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument()
    expect(rowOf('T-01').getByText('Done')).toBeInTheDocument()
    expect(rowOf('T-03').getByText('In progress')).toBeInTheDocument()
    expect(rowOf('T-03').getByText('2/4 verified')).toBeInTheDocument()
    expect(rowOf('T-05').getByText('In review')).toBeInTheDocument()
    expect(rowOf('T-05').getByText('#4 · CI pending')).toBeInTheDocument()
    expect(rowOf('T-07').getByText('Not started')).toBeInTheDocument()
    expect(rowOf('T-06').getByText('Codex')).toBeInTheDocument()
  })

  it('opens a task’s ticket with Copy as Markdown', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    const toggle = screen.getByRole('button', { name: /^T-01 / })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Copy T-01 as Markdown' })).toBeInTheDocument()
    expect(screen.getByText(/AC-1\.1\.4 The sign-in page looks right on a phone {3}👤 human test/)).toBeInTheDocument()
  })

  it('switches between list and board', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    expect(screen.getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/projects/expense-tracker/tasks?view=board')
  })

  it('shows the board with one column per status', () => {
    renderProject(<TasksView view="board" />, expenseTracker)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Not started (2)', 'In progress (1)', 'In review (2)', 'Done (2)'])
    fireEvent.click(screen.getByRole('button', { name: /^T-05 / }))
    expect(screen.getByRole('button', { name: 'Copy T-05 as Markdown' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/tasks`
Expected: FAIL. Cannot find module `./tasks-view`.

- [ ] **Step 3: Implement**

Create `src/components/project/tasks/tasks-view.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { CI_LABEL, TASK_STATUS_LABEL } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TaskTicket } from '@/components/wizard/task-ticket'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcState, ProjectData, PullRequest, Task } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { acProgress, TASK_STATUSES, taskStatus, type TaskStatus } from '@/lib/progress/taskStatus'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'

export type TasksViewMode = 'list' | 'board'

interface TaskRow {
  task: Task
  status: TaskStatus
  verified: number
  total: number
  prs: PullRequest[]
}

const prLabel = (p: PullRequest) => `#${p.number} · ${CI_LABEL[p.ci]}`

export function TasksView({ view }: { view: TasksViewMode }) {
  const { data, acStates } = useProject()
  const [selected, setSelected] = useState<string | null>(null)
  const stateById = new Map<string, AcState>(acStates.map((s) => [s.acId, s.state]))
  const rows: TaskRow[] = data.tasks.map((task) => ({
    task,
    status: taskStatus(task, data.prs, stateById),
    ...acProgress(task, stateById),
    prs: data.prs.filter((p) => p.taskIds.includes(task.id)),
  }))
  const toggle = (id: string) => setSelected((s) => (s === id ? null : id))
  const base = `/projects/${data.project.id}/tasks`

  return (
    <div className="space-y-4">
      <ScreenHeading title="Tasks" description="Technical tasks for agents, with their ACs, PRs and status." />
      <nav aria-label="Task view" className="flex gap-1 text-sm">
        <ViewLink href={base} current={view === 'list'}>
          List
        </ViewLink>
        <ViewLink href={`${base}?view=board`} current={view === 'board'}>
          Board
        </ViewLink>
      </nav>
      {view === 'list' ? (
        <TaskList rows={rows} data={data} selected={selected} onToggle={toggle} />
      ) : (
        <TaskBoard rows={rows} data={data} selected={selected} onToggle={toggle} />
      )}
    </div>
  )
}

function ViewLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={cn('rounded-md px-3 py-1', current ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50')}>
      {children}
    </Link>
  )
}

interface ViewProps {
  rows: TaskRow[]
  data: ProjectData
  selected: string | null
  onToggle: (id: string) => void
}

function TaskToggle({ row, selected, onToggle }: { row: TaskRow; selected: string | null; onToggle: (id: string) => void }) {
  return (
    <button type="button" aria-expanded={selected === row.task.id} onClick={() => onToggle(row.task.id)} className="text-left hover:underline">
      <span className="font-medium">{row.task.id}</span> {row.task.title}
    </button>
  )
}

function TaskList({ rows, data, selected, onToggle }: ViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Story</TableHead>
          <TableHead>ACs</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>PRs</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Depends on</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Fragment key={row.task.id}>
            <TableRow>
              <TableCell className="whitespace-normal">
                <TaskToggle row={row} selected={selected} onToggle={onToggle} />
              </TableCell>
              <TableCell>{row.task.storyId}</TableCell>
              <TableCell className="tabular-nums">{`${row.verified}/${row.total} verified`}</TableCell>
              <TableCell>{TASK_STATUS_LABEL[row.status]}</TableCell>
              <TableCell>
                {row.prs.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  row.prs.map((p) => (
                    <div key={p.number}>{prLabel(p)}</div>
                  ))
                )}
              </TableCell>
              <TableCell>{row.task.agent ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
              <TableCell>{row.task.dependsOn.join(', ')}</TableCell>
            </TableRow>
            {selected === row.task.id && (
              <TableRow>
                <TableCell colSpan={7} className="whitespace-normal">
                  <TicketPanel row={row} data={data} />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

function TaskBoard({ rows, data, selected, onToggle }: ViewProps) {
  const open = rows.find((r) => r.task.id === selected)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const column = rows.filter((r) => r.status === status)
          return (
            <section key={status} className="space-y-2 rounded-lg bg-muted/40 p-3">
              <h3 className="text-sm font-medium">{`${TASK_STATUS_LABEL[status]} (${column.length})`}</h3>
              {column.map((row) => (
                <Card key={row.task.id} size="sm">
                  <CardContent className="space-y-1 text-sm">
                    <TaskToggle row={row} selected={selected} onToggle={onToggle} />
                    <p className="text-xs text-muted-foreground">{`${row.verified}/${row.total} verified${row.task.agent ? ` · ${row.task.agent}` : ''}`}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          )
        })}
      </div>
      {open && <TicketPanel row={open} data={data} />}
    </div>
  )
}

function TicketPanel({ row, data }: { row: TaskRow; data: ProjectData }) {
  const acById = new Map(acsOf(currentScope(data.project)).map((a) => [a.id, a]))
  const acs = row.task.acIds.flatMap((id) => acById.get(id) ?? [])
  return (
    <div className="space-y-2">
      <TaskTicket task={row.task} acs={acs} />
      <p className="text-sm text-muted-foreground">
        {row.prs.length === 0 ? 'No PRs yet.' : `PRs: ${row.prs.map((p) => `${prLabel(p)} (${p.state})`).join(', ')}`}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Add the route**

Create `src/app/projects/[projectId]/tasks/page.tsx`:

```tsx
import { TasksView } from '@/components/project/tasks/tasks-view'

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const { view } = await searchParams
  return <TasksView view={view === 'board' ? 'board' : 'list'} />
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/tasks && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/tasks "src/app/projects/[projectId]/tasks"
git commit -m "feat: add the Tasks screen with list and board views"
```

---

### Task 22: Evidence screen

**Files:**
- Create: `src/components/project/evidence/evidence-view.tsx`
- Create: `src/app/projects/[projectId]/evidence/page.tsx`
- Test: `src/components/project/evidence/evidence-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/evidence/evidence-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { EvidenceView } from './evidence-view'

// AC cells are named "AC-x.y.z", plus " Needs a human tester" for 👤 ACs.
const acCells = () => within(screen.getByRole('table')).getAllByRole('cell', { name: /^AC-/ })
const rowOf = (acId: string) => {
  const cell = within(screen.getByRole('table')).getByRole('cell', { name: (name) => name === acId || name.startsWith(`${acId} `) })
  const row = cell.closest('tr')
  if (!row) throw new Error(`no row for ${acId}`)
  return within(row)
}

describe('EvidenceView', () => {
  beforeEach(() => getDecisionStore().reset(customerPortal.project.id))

  it('shows one row per AC with its latest evidence', () => {
    renderProject(<EvidenceView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Evidence' })).toBeInTheDocument()
    expect(acCells()).toHaveLength(21)
    const ac = rowOf('AC-3.1.2')
    expect(ac.getByText('PR #106')).toBeInTheDocument()
    expect(ac.getByText('Reported failing')).toBeInTheDocument()
    expect(ac.getByText('e2e · invoices-filter.spec.ts')).toBeInTheDocument()
    expect(ac.getByText('CI failing')).toBeInTheDocument()
    expect(rowOf('AC-2.1.4').getByText('Human test')).toBeInTheDocument()
    expect(rowOf('AC-3.1.5').getByText('No evidence yet')).toBeInTheDocument()
  })

  it('shows PR #103 as the earlier evidence of AC-3.1.2', () => {
    renderProject(<EvidenceView />, customerPortal)
    expect(screen.queryByText('PR #103')).not.toBeInTheDocument()
    expect(rowOf('AC-3.1.2').queryByRole('button')).toBeNull() // the toggle sits in the row below the AC's row
    const toggles = screen.getAllByRole('button', { name: /earlier/ })
    const forAc = toggles.find((b) => b.closest('tr')?.previousElementSibling?.textContent?.startsWith('AC-3.1.2'))
    if (!forAc) throw new Error('no toggle for AC-3.1.2')
    fireEvent.click(forAc)
    expect(screen.getByText('PR #103')).toBeInTheDocument()
    expect(rowOf('AC-3.1.2').queryByText('PR #103')).not.toBeInTheDocument()
  })

  it('filters by state and by missing evidence', () => {
    renderProject(<EvidenceView />, customerPortal)
    fireEvent.click(screen.getByRole('button', { name: 'Failing or regressed' }))
    expect(screen.getByRole('button', { name: 'Failing or regressed' })).toHaveAttribute('aria-pressed', 'true')
    expect(acCells().map((c) => c.textContent)).toEqual(['AC-3.1.2'])
    fireEvent.click(screen.getByRole('button', { name: 'No evidence' }))
    expect(acCells().length).toBeGreaterThan(0)
    for (const cell of acCells()) expect(cell.closest('tr')?.textContent).toContain('No evidence yet')
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/evidence`
Expected: FAIL. Cannot find module `./evidence-view`.

- [ ] **Step 3: Implement**

Create `src/components/project/evidence/evidence-view.tsx`:

```tsx
'use client'

import { Fragment, useState } from 'react'
import { CI_LABEL, MARK_LABEL } from '@/components/labels'
import { HumanTestMark } from '@/components/human-test-mark'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcState } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { evidenceByAc, type EvidenceItem } from '@/lib/progress/evidence'
import { AcStateBadge } from '../ac-state-badge'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'

type Filter = 'all' | 'verified' | 'failing' | 'unverified' | 'none'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'failing', label: 'Failing or regressed' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'none', label: 'No evidence' },
]

function matches(filter: Filter, state: AcState, items: EvidenceItem[]): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'verified':
      return state === 'verified'
    case 'failing':
      return state === 'failing' || state === 'regressed'
    case 'unverified':
      return state === 'implemented' || state === 'pending_user_testing'
    case 'none':
      return items.length === 0
  }
}

export function EvidenceView() {
  const { data, acStates } = useProject()
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const evidence = evidenceByAc(data)
  const stateById = new Map(acStates.map((s) => [s.acId, s.state]))
  const rows = acsOf(currentScope(data.project))
    .map((ac) => ({ ac, state: stateById.get(ac.id) ?? 'not_started', items: evidence.get(ac.id) ?? [] }))
    .filter((r) => matches(filter, r.state, r.items))

  const toggle = (acId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(acId)) next.delete(acId)
      else next.add(acId)
      return next
    })

  return (
    <div className="space-y-4">
      <ScreenHeading title="Evidence" description="What proves each AC: PR test plans with their CI result, and human test results." />
      <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? 'default' : 'outline'} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>AC</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>How tested</TableHead>
            <TableHead>CI</TableHead>
            <TableHead>Commit</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ ac, state, items }) => {
            const [latest, ...earlier] = items
            const open = expanded.has(ac.id)
            return (
              <Fragment key={ac.id}>
                <TableRow>
                  <TableCell title={ac.text}>
                    {ac.id}
                    {ac.humanTest && <HumanTestMark />}
                  </TableCell>
                  <TableCell>
                    <AcStateBadge state={state} />
                  </TableCell>
                  {latest ? (
                    <EvidenceCells item={latest} />
                  ) : (
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No evidence yet
                    </TableCell>
                  )}
                </TableRow>
                {earlier.length > 0 && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={7}>
                      <button type="button" aria-expanded={open} onClick={() => toggle(ac.id)} className="text-xs text-muted-foreground hover:underline">
                        {open ? 'Hide earlier' : `+${earlier.length} earlier`}
                      </button>
                    </TableCell>
                  </TableRow>
                )}
                {open &&
                  earlier.map((item, i) => (
                    <TableRow key={`${ac.id}-earlier-${i}`} className="text-muted-foreground">
                      <TableCell />
                      <TableCell />
                      <EvidenceCells item={item} />
                    </TableRow>
                  ))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function EvidenceCells({ item }: { item: EvidenceItem }) {
  if (item.kind === 'human') {
    return (
      <>
        <TableCell>Human test</TableCell>
        <TableCell>{item.result === 'pass' ? 'Pass' : 'Fail'}</TableCell>
        <TableCell>{`${item.tester} · ${item.environment}`}</TableCell>
        <TableCell>—</TableCell>
        <TableCell>—</TableCell>
        <TableCell>{formatDate(item.at)}</TableCell>
      </>
    )
  }
  return (
    <>
      <TableCell>{`PR #${item.prNumber}`}</TableCell>
      <TableCell>{MARK_LABEL[item.mark]}</TableCell>
      <TableCell>{[item.testType, item.testFile].filter(Boolean).join(' · ') || '—'}</TableCell>
      <TableCell>{CI_LABEL[item.ci]}</TableCell>
      <TableCell className="font-mono text-xs">{item.sha}</TableCell>
      <TableCell>{formatDate(item.at)}</TableCell>
    </>
  )
}
```

The "+N earlier" toggle sits in its own row below the AC's row, and earlier evidence opens as extra rows below it.

- [ ] **Step 4: Add the route**

Create `src/app/projects/[projectId]/evidence/page.tsx`:

```tsx
import { EvidenceView } from '@/components/project/evidence/evidence-view'

export default function EvidencePage() {
  return <EvidenceView />
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/evidence && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/evidence "src/app/projects/[projectId]/evidence"
git commit -m "feat: add the Evidence screen"
```

---

### Task 23: Changelog screen

**Files:**
- Create: `src/components/project/changelog/changelog-view.tsx`
- Create: `src/app/projects/[projectId]/changelog/page.tsx`
- Test: `src/components/project/changelog/changelog-view.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/project/changelog/changelog-view.test.tsx`:

```tsx
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { customerPortal } from '@/lib/mock/project-b'
import { renderProject } from '../test-utils'
import { ChangelogView } from './changelog-view'

const entries = () => within(screen.getByRole('list', { name: 'Changelog entries' })).getAllByRole('listitem', { name: /./ })

describe('ChangelogView', () => {
  beforeEach(() => getDecisionStore().reset(customerPortal.project.id))

  it('lists versions and rejections, newest first', () => {
    renderProject(<ChangelogView />, customerPortal)
    expect(screen.getByRole('heading', { level: 2, name: 'Changelog' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['v1 → v1.1', 'SCR-3 rejected, no version change', 'v1 locked'])
  })

  it('describes a version change with its SCR and diff', () => {
    renderProject(<ChangelogView />, customerPortal)
    const [version] = entries()
    const v = within(version)
    expect(v.getByText('+2 ACs')).toBeInTheDocument()
    expect(v.getByText('6 Oct 2026, 14:00 · approved by Lena Fischer')).toBeInTheDocument()
    expect(v.getByText('SCR-1 Download invoices as PDF · Agent · PR #104 · raised 30 Sep')).toBeInTheDocument()
    fireEvent.click(v.getByText('Show changes'))
    expect(v.getByText('AC AC-3.1.5')).toBeInTheDocument()
  })

  it('records a rejection made in the demo', () => {
    getDecisionStore().decideScr(customerPortal.project.id, 'SCR-2', { status: 'rejected', decidedAt: '2026-10-16T09:00:00+02:00', decidedBy: 'Lena Fischer', reason: 'Not now' })
    renderProject(<ChangelogView />, customerPortal)
    const [first] = entries()
    expect(within(first).getByRole('heading', { name: 'SCR-2 rejected, no version change' })).toBeInTheDocument()
    expect(within(first).getByText('Reason: Not now')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/components/project/changelog`
Expected: FAIL. Cannot find module `./changelog-view`.

- [ ] **Step 3: Implement**

Create `src/components/project/changelog/changelog-view.tsx`:

```tsx
'use client'

import { scrSourceLabel } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import type { ScopeChangeRequest } from '@/lib/domain/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { changelog, type ChangelogEntry } from '@/lib/progress/changelog'
import { diffSummary } from '@/lib/progress/diffScopes'
import { useProject } from '../project-data-provider'
import { ScopeDiffList } from '../scope-diff-list'
import { ScreenHeading } from '../screen-heading'

export function ChangelogView() {
  const { data } = useProject()
  const entries = changelog(data)
  return (
    <div className="space-y-4">
      <ScreenHeading title="Changelog" description="Append-only record of scope versions and decisions." />
      <ol aria-label="Changelog entries" className="space-y-3">
        {entries.map((entry, i) => (
          <Entry key={`${entry.kind}-${entry.at}-${i}`} entry={entry} index={i} />
        ))}
      </ol>
    </div>
  )
}

function Entry({ entry, index }: { entry: ChangelogEntry; index: number }) {
  const headingId = `changelog-${index}`
  const title =
    entry.kind === 'initial' ? `${entry.version} locked` : entry.kind === 'version' ? `${entry.from} → ${entry.to}` : `${entry.scr.id} rejected, no version change`

  return (
    <li aria-labelledby={headingId}>
      <Card>
        <CardContent className="space-y-2 text-sm">
          <h3 id={headingId} className="text-base font-medium">
            {title}
          </h3>
          {entry.kind === 'initial' && (
            <>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · approved by ${entry.approvedBy}`}</p>
              <p>Initial scope</p>
            </>
          )}
          {entry.kind === 'version' && (
            <>
              <p className="font-medium">{diffSummary(entry.diff)}</p>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · approved by ${entry.approvedBy}`}</p>
              {entry.scr && <ScrLines scr={entry.scr} />}
              <details>
                <summary className="cursor-pointer text-muted-foreground">Show changes</summary>
                <div className="pt-2">
                  <ScopeDiffList entries={entry.diff} />
                </div>
              </details>
            </>
          )}
          {entry.kind === 'rejected' && (
            <>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · rejected by ${entry.scr.decidedBy ?? 'unknown'}`}</p>
              <ScrLines scr={entry.scr} />
            </>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

function ScrLines({ scr }: { scr: ScopeChangeRequest }) {
  return (
    <>
      <p>{`${scr.id} ${scr.title} · ${scrSourceLabel(scr)} · raised ${formatDate(scr.raisedAt)}`}</p>
      {scr.rationale && <p className="text-muted-foreground">{scr.rationale}</p>}
      {scr.decisionReason && <p>{`Reason: ${scr.decisionReason}`}</p>}
    </>
  )
}
```

`entries()` in the test selects only the named `<li>`s (the changelog entries), not the diff list items inside them.

- [ ] **Step 4: Add the route**

Create `src/app/projects/[projectId]/changelog/page.tsx`:

```tsx
import { ChangelogView } from '@/components/project/changelog/changelog-view'

export default function ChangelogPage() {
  return <ChangelogView />
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/components/project/changelog && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/changelog "src/app/projects/[projectId]/changelog"
git commit -m "feat: add the Changelog screen"
```

---

### Task 24: Metrics placeholder

**Files:**
- Create: `src/components/project/metrics/metrics-view.tsx`
- Create: `src/app/projects/[projectId]/metrics/page.tsx`
- Test: `src/components/project/metrics/metrics-view.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/project/metrics/metrics-view.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricsView } from './metrics-view'

describe('MetricsView', () => {
  it('explains where the Metabase dashboards will appear', () => {
    render(<MetricsView />)
    expect(screen.getByRole('heading', { level: 2, name: 'Metrics' })).toBeInTheDocument()
    expect(screen.getByText('Pulse KPI dashboards (flow time, cycle time, throughput) from Metabase appear here.')).toBeInTheDocument()
    expect(screen.getByText('Signed embedding is on the roadmap.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `npx vitest run src/components/project/metrics`
Expected: FAIL. Cannot find module `./metrics-view`.

- [ ] **Step 3: Implement**

Create `src/components/project/metrics/metrics-view.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { ScreenHeading } from '../screen-heading'

/** Placeholder for the embedded Metabase tab (README §4). No iframe in the POC. */
export function MetricsView() {
  return (
    <div className="space-y-4">
      <ScreenHeading title="Metrics" description="Traditional delivery KPIs from the existing Pulse platform." />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm">Pulse KPI dashboards (flow time, cycle time, throughput) from Metabase appear here.</p>
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
            Signed embedding is on the roadmap.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Add the route**

Create `src/app/projects/[projectId]/metrics/page.tsx`:

```tsx
import { MetricsView } from '@/components/project/metrics/metrics-view'

export default function MetricsPage() {
  return <MetricsView />
}
```

- [ ] **Step 5: Run the test to make sure it passes**

Run: `npx vitest run src/components/project/metrics`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/metrics "src/app/projects/[projectId]/metrics"
git commit -m "feat: add the Metrics placeholder"
```

---

### Task 25: End-to-end tests

**Files:**
- Create: `e2e/project-tabs.spec.ts`
- Modify: `e2e/overview.spec.ts`

- [ ] **Step 1: Update the Overview e2e numbers**

In `e2e/overview.spec.ts`, change `'60%'` to `'57%'` and `'70%'` to `'71%'`.

- [ ] **Step 2: Write the new spec**

Create `e2e/project-tabs.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'

const TABS = ['User testing', 'Scope', 'Tasks', 'Evidence', 'Approvals', 'Changelog', 'Metrics']

async function approveCsvExport(page: Page) {
  await page.goto('/projects/expense-tracker/approvals')
  await expect(page.getByRole('heading', { level: 2, name: 'Approvals' })).toBeVisible()
  await page.getByLabel('Reason').fill('Accountants need it for tax returns')
  await page.getByRole('button', { name: 'Approve SCR-1' }).click()
  await expect(page.getByText('Approved by Maya Patel on 16 Oct · created v1.1')).toBeVisible()
}

test('approving a scope change creates v1.1 everywhere', async ({ page }) => {
  await approveCsvExport(page)
  await expect(page.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeVisible()
  await expect(page.getByText('1 pending approval')).toHaveCount(0)

  await page.getByRole('link', { name: 'Compare v1 → v1.1' }).click()
  await expect(page).toHaveURL(/\/scope\?from=v1&to=v1\.1$/)
  await expect(page.getByRole('region', { name: 'Changes from v1 to v1.1' }).getByRole('listitem')).toHaveCount(5)

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Changelog' }).click()
  await expect(page.getByRole('heading', { name: 'v1 → v1.1' })).toBeVisible()
  await expect(page.getByText('+1 feature, +1 story, +3 ACs')).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByText('6 of 20 ACs verified')).toBeVisible()

  await page.goto('/')
  const row = page.getByRole('row').filter({ hasText: 'Expense tracker' })
  await expect(row.getByRole('cell', { name: 'v1.1', exact: true })).toBeVisible()
  await expect(row.getByText('Completion 30% · Delivery 40%')).toBeVisible()
})

test('recording a human test updates the queue, warnings, evidence and portfolio', async ({ page }) => {
  await page.goto('/projects/intelligent-flow/user-testing')
  await expect(page.getByRole('heading', { name: 'Waiting for a tester (3)' })).toBeVisible()
  await page.getByRole('button', { name: 'Record result for AC-3.1.5' }).click()
  const form = page.getByRole('form', { name: 'Record result for AC-3.1.5' })
  await form.getByLabel('Pass').check()
  await form.getByLabel('Environment').fill('Staging')
  await form.getByLabel('Tester').fill('Demo tester')
  await form.getByRole('button', { name: 'Save result' }).click()
  await expect(page.getByRole('heading', { name: 'Waiting for a tester (2)' })).toBeVisible()
  await expect(page.getByRole('table').getByRole('cell', { name: 'AC-3.1.5' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByText('2 👤 ACs are waiting for a tester, the oldest since 9 Oct')).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Evidence' }).click()
  const evidenceRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: /^AC-3\.1\.5/ }) })
  await expect(evidenceRow.getByText('Human test')).toBeVisible()
  await expect(evidenceRow.getByText('Pass')).toBeVisible()

  await page.goto('/')
  const row = page.getByRole('row').filter({ hasText: 'Intelligent Flow' }).filter({ hasNotText: 'v2' })
  await expect(row.getByText('5 / 28')).toBeVisible()
})

test('rejecting a scope change keeps the version and logs the decision', async ({ page }) => {
  await page.goto('/projects/customer-portal/approvals')
  await page.getByLabel('Reason').fill('Not in this release')
  await page.getByRole('button', { name: 'Reject SCR-2' }).click()
  await expect(page.getByText('Rejected by Lena Fischer on 16 Oct')).toBeVisible()
  await expect(page.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Changelog' }).click()
  await expect(page.getByRole('heading', { name: 'SCR-2 rejected, no version change' })).toBeVisible()
})

test('Reset demo decisions brings back the mock state', async ({ page }) => {
  await approveCsvExport(page)
  await page.getByRole('button', { name: 'Reset demo decisions' }).click()
  await expect(page.getByText(/Scope v1 · locked 6 Oct by Maya Patel/)).toBeVisible()
  await expect(page.getByText('1 pending approval')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Waiting for a decision (1)' })).toBeVisible()
})

for (const projectId of ['expense-tracker', 'customer-portal', 'intelligent-flow']) {
  test(`every tab of ${projectId} loads`, async ({ page }) => {
    for (const tab of TABS) {
      await page.goto(`/projects/${projectId}`)
      const nav = page.getByRole('navigation', { name: 'Project' })
      await nav.getByRole('link', { name: tab, exact: true }).click()
      await expect(page.getByRole('heading', { level: 2, name: tab })).toBeVisible()
      await expect(nav.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })
}

test('every tab of Intelligent Flow v2 loads after the wizard locks v1', async ({ page }) => {
  await page.goto('/projects/new')
  await page.getByRole('button', { name: 'Submit to planner' }).click()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await page.getByRole('button', { name: 'Approve all' }).click()
  await page.getByRole('button', { name: 'Lock v1' }).click()
  await expect(page.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeVisible()

  for (const tab of TABS) {
    await page.goto('/projects/intelligent-flow-v2')
    await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: tab, exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: tab })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Reset demo decisions' })).toHaveCount(0)
})
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS (all specs, including `wizard.spec.ts`, `portfolio.spec.ts`, `overview.spec.ts`). The first run builds the app (up to 3 minutes).

If a locator is ambiguous (Playwright "strict mode violation"), scope it to the relevant row, card or region instead of loosening the assertion.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test: add end-to-end tests for the project tabs"
```

---

### Task 26: Update ARCHITECTURE.md

**Files:**
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Update the folder structure**

In the `src/app/` part of the folder tree, replace the `projects/[projectId]/` lines with:

```
    projects/[projectId]/
      layout.tsx                loads raw data (or the wizard draft) into ProjectDataProvider
      page.tsx                  Overview
      user-testing/ scope/ tasks/ evidence/ approvals/ changelog/ metrics/
                                one thin page each; the screen is a client view
```

and in the `components/` part, replace the `project/` line with:

```
    project/                    project screens: provider, shell, sidebar, one folder per tab
```

and add under `lib/`:

```
    decisions/                  DecisionStore (localStorage): wizard decisions, human test results, SCR decisions
```

- [ ] **Step 2: Replace the Data flow section**

Replace everything under `## Data flow` up to `## Tests` with:

````markdown
```
layout.tsx / page.tsx (async Server Components)
  → getRepository()                     src/lib/data/index.ts
  → getProjectData / getAllProjectData  raw facts from src/lib/mock/*
  → ProjectDataProvider / PortfolioView (client)
      → useDecisions / useAllDecisions  src/lib/decisions (localStorage)
      → applyProjectDecisions           src/lib/progress: human tests, SCR decisions → new scope versions, computed warnings
      → deriveAcStates, view models     src/lib/progress, src/lib/data/view-models.ts
  → useProject() in every tab           { data, acStates, now }
```

Rules:
- **No API routes.** Server pages load raw facts through the repository. Human decisions (wizard approvals and lock, human test results, SCR decisions) live in the browser's `DecisionStore` and are merged on the client, so every screen shows the same numbers.
- **The UI never imports `lib/mock`.** It goes through `lib/data`, so a Postgres implementation can replace the mock without UI changes. A DB-backed `DecisionStore` can replace localStorage the same way.
- **Mocks hold raw facts only** (scope, tasks, parsed PRs, human test results, SCRs with their proposals, warnings). AC states, new scope versions and all numbers are derived in `lib/progress` (README §3.3).
- **Computed warnings:** `pending_user_testing` and `pending_decision` come from `deriveWarnings`, so they follow decisions. Other warning types are mock records until the rules engine exists.
- **`lib/progress` is pure:** no I/O, no real clock. "Now" is passed in (`DEMO_NOW` in the POC).
- The server renders mock projects with no decisions; stored decisions apply right after hydration. Intelligent Flow v2 only renders on the client, because it exists only once this browser locks its v1.
````

- [ ] **Step 3: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: describe the project provider and the new tabs"
```

---

### Task 27: Verify before calling it done

Use `superpowers:verification-before-completion`.

- [ ] **Step 1: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected: all pass. Paste the summary lines (test counts, build result) into the hand-off.

- [ ] **Step 2: Look at every tab in the browser**

Run: `npm run dev`, open <http://localhost:3000>. For A, B, C and Intelligent Flow v2 (lock it in the wizard first), open every tab in light mode, then in dark mode (switch the OS or browser to a dark colour scheme). Check:
- Headings, tables and the board fit at desktop width and on a narrow window; nothing overflows horizontally except the tables' own scroll.
- State dots and diff markers are visible in both themes.
- The three demo flows work by hand: approve A's SCR-1, record a pass for C's AC-3.1.5, reject B's SCR-2. Then use **Reset demo decisions** on each project.
- Intelligent Flow's screens say "dashboard" wherever the product UI is named, never "console", and show nothing from the scope doc's review notes.

- [ ] **Step 3: Report**

Summarise what was built, the check results, and anything that didn't match the spec. Don't claim done until Steps 1–2 pass.
