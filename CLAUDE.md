# CLAUDE.md — ExampleHR Time-Off Frontend

Agent operating guide for this repo. **Read `ExampleHR-TimeOff-Frontend-BRIEF.md` first** — it is the spec. This file is the *how we work here* layer: guardrails, conventions, commands, and the definition of done. When the brief and this file disagree, the brief wins on **what**, this file wins on **how**.

---

## Golden rules (non-negotiable)

1. **Never present a final outcome you can't verify.** The one hard prohibition: an employee/manager must never see "approved" and later "denied." Every state-changing HCM write is followed by an authoritative **per-cell re-read**; a contradiction rolls back to `NEEDS_ATTENTION` (recoverable), never a silent reversal. (Brief §6.)
2. **One HCM behavior, two transports.** All mock-HCM logic lives in `packages/hcm-mock`. `apps/web` route handlers and `packages/testing` MSW handlers both *import* it. **Never** copy logic into a handler. If you're tempted to, add it to `hcm-mock` instead. (Brief §5.6, §10.)
3. **Treat `200 OK` as untrusted.** Parse and **sanity-check** every HCM response with Zod at the boundary before it touches the cache. Shape-valid is not value-valid. (Brief §4, §6.)
4. **Server truth lives in TanStack Query; never mirror it into a store.** Optimistic changes are *overlays* applied in `onMutate` and removed in `onError`, layered on top of server cache — so a background refetch landing mid-mutation never clobbers an in-flight action. (Brief §6, §7.)
5. **UI components never fetch.** They consume typed hooks (`useBalance`, `useCorpus`, `useSubmitRequest`, `useDecideRequest`). Data/reconciliation logic stays in `packages/data-layer`. (Brief §11.)
6. **Storybook is the proof, not an afterthought.** Every row in the state matrix (Brief §12) gets a story; the hard ones get a play (interaction) test. A feature isn't done until its states are in Storybook.
7. **You write the code; the human writes the spec.** Don't ask the human to hand-write code. If the spec is ambiguous, state your assumption inline in the TRD/PR and proceed.

---

## Monorepo conventions

- **Tooling:** pnpm workspaces + Turborepo. Use `pnpm`, never `npm`/`yarn`. Add deps with `pnpm add <pkg> --filter <package>`.
- **Imports cross packages via the public entry** (`@repo/<name>`), never deep relative paths (`../../packages/...`). Configure path aliases once in `packages/config`.
- **Dependency direction is one-way** (see Brief §5.6 graph):
  - `contracts` depends on nothing in the workspace; everyone may import it.
  - `hcm-mock` → only `contracts`. **Only** `apps/web` and `packages/testing` may import `hcm-mock`.
  - `ui` and `data-layer` talk to HCM **over the network** (fetch `/api/hcm/*`), never by importing `hcm-mock` directly — this keeps the "source of truth is remote" boundary real.
- **Co-locate** stories + tests with their unit (`Component.tsx`, `Component.stories.tsx`, `Component.test.tsx`). MSW decorators come from `packages/testing`.
- Adding a new package needs a reason: consumed by ≥2 packages, or isolates a distinct concern. Otherwise put it in an existing one.

### Package map
| Package | Owns | May import |
|---|---|---|
| `@repo/contracts` | Zod schemas + `z.infer` types | — |
| `@repo/hcm-mock` | `HcmStore` core + fault injection | contracts |
| `@repo/data-layer` | TanStack Query hooks, optimistic/verify/reconcile logic | contracts |
| `@repo/ui` | presentational components + Storybook stories | data-layer, contracts (+ testing for stories) |
| `@repo/testing` | MSW handlers (wrap hcm-mock), fixtures, test utils | hcm-mock, contracts |
| `apps/web` | Next.js routes/pages + `/api/hcm/*` handlers | ui, data-layer, hcm-mock, contracts |

---

## How to run — every command you need

### Local development
```bash
pnpm install                     # bootstrap workspace
pnpm dev                         # Next.js app on :3000
pnpm storybook                   # Storybook dev server on :6006
pnpm lint && pnpm typecheck      # must pass before any commit
```

### Running tests

**Unit + integration (Vitest — the main test suite):**
```bash
pnpm test                                         # all packages via Turborepo
pnpm test --filter @repo/data-layer               # one package only
pnpm test --filter @repo/data-layer -- --watch    # watch mode while developing a test
pnpm test --filter @repo/data-layer -- --run      # single run, no watch (CI mode)
pnpm test -- --run -t "overlay survives"          # one test by name pattern
pnpm test -- --run --reporter verbose             # see each assertion
```

**Storybook interaction tests (play functions):**
```bash
# Option A — Storybook 8 + Vitest plugin (single command, preferred)
pnpm test          # Vitest picks up *.stories.tsx via @storybook/experimental-addon-test

# Option B — classic test-storybook runner (Storybook 7 fallback)
pnpm storybook                                    # Terminal 1: dev server on :6006
pnpm test-storybook                               # Terminal 2: runs play() functions

# Option C — CI mode (no live dev server)
pnpm build-storybook                              # compile to storybook-static/
npx http-server storybook-static -p 6006 &
pnpm test-storybook --url http://localhost:6006
```

**Coverage:**
```bash
pnpm coverage      # turbo → vitest run --coverage across all packages → outputs to coverage/
```

**Everything in one go (pre-commit / CI gate):**
```bash
pnpm test:all      # typecheck → lint → vitest → coverage → build-storybook → test-storybook
```

### Required MSW setup (wire this at Step 1 — without it integration tests don't work)
Every package with integration tests needs a `setupTests.ts` that boots MSW and resets state between tests:
```ts
// packages/data-layer/src/setupTests.ts
import { server } from '@repo/testing/msw-server'
import { hcmStore } from '@repo/hcm-mock'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()   // clear per-test fault overrides
  hcmStore.clearFaults()   // reset fault state so it never leaks between tests
  queryClient.clear()      // isolate TanStack Query cache per test
})
afterAll(() => server.close())
```
`onUnhandledRequest: 'error'` is critical — if a test fires a request MSW doesn't intercept, it fails loudly instead of silently hitting a real network.

### GitHub Actions CI
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v3
  - uses: actions/setup-node@v4
    with: { node-version: 20, cache: 'pnpm' }
  - run: pnpm install --frozen-lockfile
  - run: pnpm lint && pnpm typecheck
  - run: pnpm test -- --run
  - run: pnpm coverage
  - run: pnpm build-storybook
  - run: npx http-server storybook-static -p 6006 & sleep 3 && pnpm test-storybook --url http://localhost:6006
  - uses: actions/upload-artifact@v4
    with: { name: coverage-report, path: '**/coverage/' }
```

### Turborepo pipeline (wire in `turbo.json` at Step 1)
```json
{
  "tasks": {
    "build":            { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "test":             { "dependsOn": ["^build"], "cache": true },
    "coverage":         { "dependsOn": ["test"] },
    "typecheck":        { "dependsOn": ["^build"] },
    "lint":             {},
    "build-storybook":  { "dependsOn": ["^build"], "outputs": ["storybook-static/**"] },
    "test-storybook":   { "dependsOn": ["build-storybook"] },
    "test:all":         { "dependsOn": ["typecheck", "lint", "coverage", "test-storybook"] }
  }
}
```

---

## Coding conventions

- **TypeScript strict.** No `any`; no `@ts-ignore` without a one-line justification comment.
- **Types derive from Zod.** Define the schema in `@repo/contracts`, export `type X = z.infer<typeof XSchema>`. One source for runtime + compile-time.
- **Pure logic is extracted and unit-tested**: balance math (`available − pendingHold`), staleness derivation, the request-status reducer. No business rules buried in JSX.
- **No `localStorage`/`sessionStorage` reliance for server truth.** Query cache + (optional) Zustand for ephemeral UI only.
- **Query keys** are centralized constants in `data-layer` (`['balance', employeeId, locationId]`, etc.), never inline strings.
- Keep components presentational and prop-driven so a single component renders every matrix state from props/MSW, not internal fetching.

---

## The build — step by step (STOP AND COMMIT at each step)

Build in this exact order. **At the end of every step: run the gate, commit, tag, then STOP and report — do not begin the next step until the human says continue.** Each step leaves the repo runnable and green. Never carry a half-finished step across a commit.

### The per-step gate (must pass before every commit)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass (green — never commit red).
- [ ] New behavior is covered by the test type that guards it (see Brief §13/§13.5).
- [ ] New/changed UI states have a Storybook story (Brief §12).
- [ ] No logic duplicated outside `hcm-mock`; no deep cross-package imports (Brief §5.6).
- [ ] The relevant TRD section is updated (decision + rationale + alternatives).

### Commit rules
- **Conventional Commits**, scoped to the package (examples per step below).
- **Commit body = the "why"**: the decision made and any challenge hit (e.g. "background refetch was clobbering the overlay → moved it to onMutate snapshot"). These bodies feed `README.md`'s "challenges faced" section — write them now, not from memory.
- **Tag every step** so checkpoints are navigable: `git tag step-NN-<slug>`.
- After committing + tagging: **pause, summarize what was done, and wait.**

---

### Step 1 — Project structure & tooling
**Build:** pnpm workspaces + Turborepo. Create `apps/web` (Next.js App Router + TS) and empty packages `contracts`, `hcm-mock`, `data-layer`, `ui`, `testing`, `config`. Wire shared tsconfig/eslint/vitest in `config`; Storybook in `ui`; the turbo pipeline so `pnpm lint/typecheck/test/build/dev/storybook` run across the graph.
**Done when:** all gate commands pass on the empty packages; `pnpm dev` serves a blank app; `pnpm storybook` opens.
**Commit & STOP:**
```bash
git add -A && git commit -m "chore(repo): scaffold pnpm + turbo monorepo"
git tag step-01-scaffold
```

### Step 2 — Contracts (Zod schemas + types)
**Build:** `@repo/contracts` — `BalanceSchema`, `TimeOffRequestSchema`, `HcmWriteResultSchema` (Brief §9) as Zod schemas; export `z.infer` types. These are the one source of truth for every other package.
**Done when:** schemas exported, types consumed by a trivial typecheck; unit tests for any refinements (e.g. non-negative balance).
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(contracts): zod schemas + inferred types"
git tag step-02-contracts
```

### Step 3 — Mock HCM core
**Build:** `@repo/hcm-mock` — in-memory `HcmStore` keyed by `employeeId:locationId:policy`. No HTTP yet — pure logic. **It must simulate every behavior the PDF calls for:**
- **Real-time read/write** — authoritative per-cell read and per-cell write of a single balance.
- **Batch corpus** — return the full set of balances across all dimensions (expensive; add latency).
- **Work-anniversary bonus — on a timer OR a trigger.** Provide both: a manual trigger (e.g. `POST /api/hcm/trigger/anniversary`) for deterministic tests/stories, **and** an optional internal timer mode that bumps a cell "underneath" an open session for the live demo. (Open decision in Brief §16: default to trigger-only in tests, timer optional in the demo.)
- **Occasional silent failures** — `silent-failure` (no-op while claiming success) and `silent-wrong` (returns `200 OK` but the value is wrong/stale).
- **Occasional conflict responses** — `conflict` → `INSUFFICIENT_BALANCE` / `INVALID_DIMENSION` / `VERSION_CONFLICT`.
- **Latency** — `latency` switch for slow/degraded responses.

Faults run in two modes: **deterministic per-scenario toggles** (so each test/story pins exactly one behavior) **and** an **occasional/probabilistic mode** (so the live demo behaves realistically, matching the PDF's "occasional"). Tests always use the deterministic toggles.
**Done when:** unit tests prove each behavior in deterministic mode — per-cell read/write round-trips, corpus returns all cells, the anniversary trigger bumps a cell, `silent-wrong` returns ok-but-unchanged, `silent-failure` no-ops, `conflict` rejects, `latency` delays.
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(hcm-mock): in-memory store + fault injection"
git tag step-03-hcm-mock
```

### Step 4 — Two transports over one core
**Build:** `apps/web/app/api/hcm/*` route handlers AND `@repo/testing` MSW handlers — **both import `@repo/hcm-mock`**, neither reimplements logic. Validate inbound bodies with Zod.
**Done when:** an integration test hits the route handler and an MSW-backed test hit the same scenarios and agree; zero duplicated behavior.
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(web,testing): route handlers + MSW over shared hcm-mock"
git tag step-04-transports
```

### Step 5 — Data layer: reads
**Build:** `@repo/data-layer` — centralized query keys + `useCorpus` (hydration) and `useBalance` (authoritative per-cell). Validate responses with Zod at the boundary; derive the `staleTime`-based staleness flag.
**Done when:** integration tests cover hydration + a per-cell read; unit tests cover staleness derivation (IT-10, Brief §13.5).
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(data-layer): corpus + per-cell read hooks with zod boundary"
git tag step-05-reads
```

### Step 6 — Data layer: writes (the heart)
**Build:** `useSubmitRequest` and `useDecideRequest` with the optimistic **overlay** (`onMutate` snapshot, `onError` rollback), the **post-write verify** per-cell re-read, the **reconciliation** seam, and the request **state machine** incl. `NEEDS_ATTENTION` (Brief §6, §7, §8).
**Done when:** integration tests IT-1, IT-2, IT-3, IT-4, IT-7, IT-9 pass (Brief §13.5) — silent-wrong → NEEDS_ATTENTION, overlay survives mid-flight refresh, rollback, conflict, happy path, instant feedback.
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(data-layer): optimistic writes + verify + reconcile + state machine"
git tag step-06-writes
```

### Step 7 — Employee view
**Build:** `@repo/ui` BalanceList/BalanceCard (multi-row, stale badge, pending overlay), RequestForm (Zod validation), RequestList. Wired only through hooks — no fetching in components.
**Done when:** stories exist for the employee-side states; component renders every state from props/MSW.
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(ui): employee balance + request views"
git tag step-07-employee
```

### Step 8 — Manager view
**Build:** PendingRequestList, RequestReviewCard with a **fresh per-cell read at decision time**, approve/deny, and a ReconciliationBanner for external-change notices (Brief §11, IT-5).
**Done when:** integration test IT-5 passes (decision uses fresh value); manager states have stories.
**Commit & STOP:**
```bash
git add -A && git commit -m "feat(ui): manager review with fresh-at-decision read"
git tag step-08-manager
```

### Step 9 — Storybook state matrix
**Build:** one story per row of Brief §12 (loading, empty, stale, optimistic-pending, optimistic-rolled-back, HCM-rejected, HCM-silently-wrong, balance-refreshed-mid-session, manager-decision-context), each with its fault pinned via `@repo/testing`.
**Done when:** every required state renders as its own story; the hard ones have `play` interaction tests.
**Commit & STOP:**
```bash
git add -A && git commit -m "test(ui): storybook state matrix + interaction tests"
git tag step-09-storybook
```

### Step 10 — Test suite + coverage
**Build:** complete the integration set IT-1…IT-10 (Brief §13.5), fill unit tests (wallet math, staleness, state-machine transitions), ensure interaction tests cover the matrix. Wire `pnpm test` to run all + emit a coverage report.
**Done when:** full suite green; coverage report generated and committed.
**Commit & STOP:**
```bash
git add -A && git commit -m "test: complete integration/unit suite + coverage report"
git tag step-10-tests
```

### Step 11 — Deploy + finalize docs
**Build:** single-command run documented; deploy Storybook (Chromatic/Vercel) and the app if feasible. Finalize `docs/TRD.md` (decisions, alternatives) and the post-build `<!-- FILL -->` blanks in `README.md`.
**Done when:** a fresh clone runs with one command; TRD + README complete; links live.
**Commit & STOP:**
```bash
git add -A && git commit -m "chore: single-command run, deploy, finalize TRD + README"
git tag step-11-ship
```

---

## What to surface to the human (don't decide silently)

These are the open decisions in Brief §16 — flag your choice in the PR/TRD, don't just pick quietly:
- Manager approval: confirmed-write **(a)** vs optimistic-with-guard **(b)**.
- Request entities: client state vs a small mock ExampleHR backend.
- Reconciliation cadence + `staleTime` thresholds.
- Anniversary trigger: timer (realistic) vs trigger-only (deterministic — preferred for tests).
- Whether to include the optional Neon persistence adapter (keep it off the test path if so).
