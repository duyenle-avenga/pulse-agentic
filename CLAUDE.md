# Pulse Agentic

Read `README.md` first. It is the agreed design (purpose, concepts, evidence model, screens, decisions). `docs/demo/intelligent-flow-scope.md` is the mock data for demo Project C.

## POC rules
- Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Recharts via shadcn charts.
- Mock data only: `src/lib/mock/*`, read through a repository interface in `src/lib/data/*` so a DB can replace it later. No real Jira, GitHub or LLM calls in the app.
- Demo projects: A = greenfield, no board (Pulse is the board); B = brownfield with GitHub Issues; C = Intelligent Flow (Jira CTOACT), built from the scope doc.
- Pulse only measures and suggests. It never writes to boards (write-back is on the roadmap).
- The AC is the unit of progress. AC states and the PR-section convention (Summary / Migration / Test plan / Notes) are defined in README §3.2–3.3.

## Workflow (Superpowers)
Every feature or screen follows these steps, in order:
1. **Brainstorm:** `superpowers:brainstorming`. Settle the design with me before writing code. Save the spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
2. **Plan:** `superpowers:writing-plans`. Turn the approved spec into an implementation plan at `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`.
3. **Implement:** `superpowers:executing-plans` (or `superpowers:subagent-driven-development` for independent tasks), using `superpowers:test-driven-development`.
4. **Verify:** `superpowers:verification-before-completion`. Run the checks and look at the screen before calling it done.

Don't skip the brainstorm and plan steps for anything bigger than a small fix.

## Writing
- Generated tickets stay short: a title, one or two lines of intent, the AC checklist and a PR instruction.
- Intelligent Flow's UI is a "dashboard", not a "console".
- Keep the review notes in the scope doc out of anything shown to the Intelligent Flow team.
- Never print or commit `.env.local` (Jira bearer token).
