# Architecture

How the Pulse Agentic POC code is organised. For *what* the product does, read `README.md`.

## Folder structure

```
src/
  app/                          Next.js App Router (routes only, thin)
    layout.tsx                  top bar with the demo clock
    not-found.tsx               404 page
    page.tsx                    Portfolio
    projects/[projectId]/
      layout.tsx                project header + sidebar
      page.tsx                  Project overview
  components/
    ui/                         shadcn/ui primitives (generated; keep hand edits minimal, e.g. table `scope`)
    portfolio/                  Portfolio screen components
    project/                    Project screens' components
    labels.ts                   display labels and colours for domain enums (colours are `--ac-*` tokens in globals.css)
    project-badges.tsx          kind and board badges, shared by both screens
  lib/
    domain/                     domain types and small helpers (no I/O)
    progress/                   pure derivation: AC states, rollups, activity
    data/                       repository interface + implementations (the only door to data)
    mock/                       demo data for projects A, B and C, builders for writing it, and the demo clock
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
- **Mocks hold raw facts only** (scope, tasks, parsed PRs, human test results, SCRs, signals). AC states and all numbers are derived in `lib/progress` (README §3.3).
- **`lib/progress` is pure:** no I/O, no real clock. "Now" is passed in (`DEMO_NOW` in the POC).
- Server Components by default. Our own client components are only the ones that need the browser (charts); some shadcn primitives ship as client components.

## Tests

- `npm test`: Vitest unit and component tests, next to the code (`*.test.ts(x)`).
- `npm run test:e2e`: Playwright smoke tests against a production build.
