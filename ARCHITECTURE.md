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
      layout.tsx                loads raw data (or the wizard draft) into ProjectDataProvider
      page.tsx                  Overview
      user-testing/ scope/ tasks/ evidence/ approvals/ changelog/ metrics/
                                one thin page each; the screen is a client view
  components/
    ui/                         shadcn/ui primitives (generated; keep hand edits minimal, e.g. table `scope`)
    portfolio/                  Portfolio screen components
    project/                    project screens: provider, shell, sidebar, one folder per tab
    wizard/                     New project wizard steps and task tickets
    labels.ts                   display labels and colours for domain enums (colours are `--ac-*` tokens in globals.css)
    project-badges.tsx          kind and board badges, shared by both screens
  lib/
    domain/                     domain types and small helpers (no I/O)
    progress/                   pure derivation: AC states, rollups, activity, applying decisions to a draft
    data/                       repository interface + implementations (the only door to data)
      view-models.ts            pure mappers used by server and client
    decisions/                  DecisionStore (localStorage): wizard decisions, human test results, SCR decisions
    mock/                       demo data for projects A, B and C, builders for writing it, and the demo clock
      planner/                  planner drafts as JSON
    wizard/                     wizard helpers (ticket Markdown, lock rule)
    format.ts                   date and duration formatting
    utils.ts                    `cn()` class helper (shadcn)
e2e/                            Playwright smoke tests
docs/                           design docs, specs and plans
```

## Data flow

```
layout.tsx / page.tsx (async Server Components)
  → getRepository()                     src/lib/data/index.ts
  → getProjectData / getAllProjectData  raw facts from src/lib/mock/*
  → ProjectDataProvider / PortfolioView (client)
      → useDecisions / useAllDecisions  src/lib/decisions (localStorage)
      → applyProjectDecisions           src/lib/progress: human tests, SCR decisions → new scope versions, computed warnings
      → deriveAcStates, view models     src/lib/progress (evidence from before an AC's last text change is skipped), src/lib/data/view-models.ts
  → useProject() in every tab           { data, acStates, now }
```

Rules:
- **No API routes.** Server pages load raw facts through the repository. Human decisions (wizard approvals and lock, human test results, SCR decisions) live in the browser's `DecisionStore` and are merged on the client, so every screen shows the same numbers.
- **The UI never imports `lib/mock`.** It goes through `lib/data`, so a Postgres implementation can replace the mock without UI changes. A DB-backed `DecisionStore` can replace localStorage the same way.
- **Mocks hold raw facts only** (scope, tasks, parsed PRs, human test results, SCRs with their proposals, warnings). AC states, new scope versions and all numbers are derived in `lib/progress` (README §3.3).
- **Computed warnings:** `pending_user_testing` and `pending_decision` come from `deriveWarnings`, so they follow decisions. Other warning types are mock records until the rules engine exists.
- **`lib/progress` is pure:** no I/O, no real clock. "Now" is passed in (`DEMO_NOW` in the POC).
- The server renders mock projects with no decisions; stored decisions apply right after hydration. Intelligent Flow v2 only renders on the client, because it exists only once this browser locks its v1.

## Tests

- `npm test`: Vitest unit and component tests, next to the code (`*.test.ts(x)`).
- `npm run test:e2e`: Playwright smoke tests against a production build.
