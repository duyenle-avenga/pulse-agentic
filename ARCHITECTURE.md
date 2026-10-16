# Architecture

How the Pulse Agentic POC code is organised. For *what* the product does, read `README.md`.

## Folder structure

```
src/
  app/                          Next.js App Router (routes only, thin)
    layout.tsx                  top bar with the demo clock
    not-found.tsx               404 page
    page.tsx                    Portfolio
    projects/new/page.tsx       New project wizard
    projects/[projectId]/
      layout.tsx                project header + sidebar
      page.tsx                  Project overview
  components/
    ui/                         shadcn/ui primitives (generated; keep hand edits minimal, e.g. table `scope`)
    portfolio/                  Portfolio screen components
    project/                    Project screens' components
    wizard/                     New project wizard steps and task tickets
    labels.ts                   display labels and colours for domain enums (colours are `--ac-*` tokens in globals.css)
    project-badges.tsx          kind and board badges, shared by both screens
  lib/
    domain/                     domain types and small helpers (no I/O)
    progress/                   pure derivation: AC states, rollups, activity, applying decisions to a draft
    data/                       repository interface + implementations (the only door to data)
      view-models.ts            pure mappers used by server and client
    decisions/                  decision store: localStorage now, DB later
    mock/                       demo data for projects A, B and C, builders for writing it, and the demo clock
      planner/                  planner drafts as JSON
    wizard/                     wizard helpers (ticket Markdown)
    format.ts                   date and duration formatting
    utils.ts                    `cn()` class helper (shadcn)
e2e/                            Playwright smoke tests
docs/                           design docs, specs and plans
```

## Data flow

```
page.tsx (async Server Component)
  → getRepository()                 src/lib/data/index.ts
  → MockRepository                  src/lib/data/mock-repository.ts
      → raw facts                   src/lib/mock/*
      → deriveAcStates, rollup,     src/lib/progress/*
        recentActivity
  → plain view models (props)
  → components
```

Rules:
- **No API routes yet.** Pages call the repository directly. Later write flows (user testing, approvals) will use Server Actions over the same repository.
- **The UI never imports `lib/mock`.** It goes through `lib/data`, so a Postgres implementation can replace the mock without UI changes.
- **Mocks hold raw facts only** (scope, tasks, parsed PRs, human test results, SCRs, warnings). AC states and all numbers are derived in `lib/progress` (README §3.3).
- **`lib/progress` is pure:** no I/O, no real clock. "Now" is passed in (`DEMO_NOW` in the POC).
- **Decisions.** Content (projects, planner drafts) comes from the repository on the server. Human decisions (story approvals, the v1 lock) are only read and written through `DecisionStore` (`lib/decisions`), currently localStorage. Client components combine a draft with the decisions using `applyDecisions` (`lib/progress`) and the shared view-model helpers. Client code imports `@/lib/data/view-models` and `@/lib/data/repository` types, never values from `@/lib/data` (that pulls in the mock data).
- Server Components by default. Our own client components are the decision-aware ones (`PortfolioView`, `Wizard`, `DraftProjectLayout`, `DraftOverview`, `TaskTicket`); everything else is a Server Component. Some shadcn primitives ship as client components.

## Tests

- `npm test`: Vitest unit and component tests, next to the code (`*.test.ts(x)`).
- `npm run test:e2e`: Playwright smoke tests against a production build.
