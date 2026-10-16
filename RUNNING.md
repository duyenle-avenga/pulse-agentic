# Running Pulse Agentic locally

How to get the POC running on your machine. For what the product does, read `README.md`. For how the code is laid out, read `ARCHITECTURE.md`.

## Prerequisites

- **Node.js 20.9 or later** (Next.js 16 needs it). Tested with Node 24.
- **npm** (comes with Node). The repo has a `package-lock.json`, so use npm, not yarn or pnpm.

You don't need any environment variables, accounts or API keys. The app uses only the mock data in `src/lib/mock/*`.

## 1. Install

```bash
git clone <repo-url>
cd "agentic project manager"
npm install
```

## 2. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. You land on the **Portfolio**, which lists the three demo projects:

| Project | What it shows |
|---|---|
| A | Greenfield, no board (Pulse is the board) |
| B | Brownfield, backed by GitHub Issues |
| C | Intelligent Flow (Jira CTOACT), built from `docs/demo/intelligent-flow-scope.md` |

Click a project to open its **Project overview**.

The dates on screen come from a fixed demo clock (`DEMO_NOW` in `src/lib/mock`), not today's date. That way the numbers look the same every time you run the app.

To use a different port: `npm run dev -- -p 3001`.

## 3. Run a production build (optional)

```bash
npm run build
npm run start
```

This serves the built app on <http://localhost:3000>.

## Checks

| Command | What it does |
|---|---|
| `npm test` | Vitest unit and component tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | TypeScript check, no output files |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright smoke tests (see below) |

### End-to-end tests

The first time, install the Playwright browser:

```bash
npx playwright install chromium
```

`npm run test:e2e` builds the app and serves it on port **3100**, then runs the tests in `e2e/`. If something is already running on port 3100, Playwright uses it instead of starting a new server (except in CI).

## Troubleshooting

- **Port 3000 is already in use:** Next.js picks the next free port and prints it. You can also set a port with `-p`.
- **Old or odd output after you switch branches:** stop the server, delete the `.next` folder and run `npm run dev` again.
- **`npm install` fails on Node versions:** check `node --version`. It must be 20.9 or later.

