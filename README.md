# ExampleHR — Time-Off Frontend

A frontend for requesting and approving time off, where the **balances are owned by an external HCM system** (Workday/SAP class) that ExampleHR doesn't control. The whole challenge is presenting those balances so they feel *instant and trustworthy* while staying honest that the numbers live somewhere else and can change — or be wrong — underneath us.

> This README is the **practical guide**: how to run it, how to test it, and what's actually in the app. The *why* behind every decision is in the **[Technical Requirements Document → `docs/TRD.md`](./docs/TRD.md)**. The full spec is in [`ExampleHR-TimeOff-Frontend-BRIEF.md`](./ExampleHR-TimeOff-Frontend-BRIEF.md); build conventions are in [`CLAUDE.md`](./CLAUDE.md).

---

## Quick start

```bash
pnpm install        # bootstrap the workspace
pnpm dev            # the Next.js app + the /api/hcm/* API (one process) → http://localhost:3000
```

That's the whole thing — the UI **and** the mock HCM backend run from the single `pnpm dev` process. Open the app, and the demo data seeds automatically on first page render.

> **Note on the port:** if `3000` is taken, Next picks the next free port (e.g. `3002`) and prints it — check the terminal for `Local: http://localhost:<port>`.

---

## The problem in one paragraph

If an employee sees "10 days available" and requests 2, the UI must respond instantly — but the HCM might reject the write, or the "10" might already be stale because HCM granted a work-anniversary bonus thirty seconds ago. Worse, HCM *usually* returns a clean error on an invalid/insufficient request, but **not always** — a `200 OK` can still be wrong. The non-negotiable UX rule that falls out of this: an employee must **never** be told "approved" and then later "actually, denied."

---

## What's in the app

Two tabs, three feature areas:

### Employee View
- **Who am I** — name header + avatar, with an **employee picker** dropdown to switch between Maya, Alex, and Jordan (and Maya's second location).
- **Balances** — multi-row cards (PTO / Sick / per-location), each with a **stale badge**, a **pending-hold** overlay, and a smoothly **animated** available count.
- **Request time off** — a **Vacation (PTO) / Sick Leave** tab selector; the form and balance math switch to the selected policy. Submitting is optimistic (instant `PENDING` + hold).
- **Your requests** — the employee's own request list, newest first.

### Manager View
- **Anniversary / Bonus PTO** (top) — grant a bonus to any **PTO** cell; the employee's balance reconciles to the new total while pending holds are preserved. (Bonuses are PTO-only.)
- **Pending requests** (below) — review cards, **newest first**, each doing a **fresh per-cell read at decision time**, with approve/deny, a `NEEDS_ATTENTION` recovery path, and a reconciliation banner.

### Under the hood (the actual hard part)
- Optimistic **overlay** for intent; **confirmed-write + verify** for outcome.
- Every write is followed by an **authoritative per-cell re-read**; `200 OK` is never trusted.
- Background refreshes and bonus grants reconcile **without clobbering** in-flight optimistic state or a fresher per-cell read.

---

## How to run — every command

### Develop
```bash
pnpm dev            # Next.js app + API on :3000
pnpm storybook      # the state matrix on :6006 (the real proof of behavior)
pnpm lint           # eslint across the graph
pnpm typecheck      # tsc --noEmit across the graph
```

### Test
```bash
pnpm test                                   # all packages (unit + integration + interaction) via Turborepo
pnpm test --filter @repo/data-layer         # one package
pnpm test --filter @repo/data-layer -- --run        # single run, no watch (CI mode)
pnpm test -- --run -t "overlay survives"            # one test by name pattern
pnpm coverage                               # coverage report across all packages → coverage/
```

**Storybook interaction tests** (the `play()` functions) run against a built/served Storybook:
```bash
pnpm build-storybook
npx http-server storybook-static -p 6006 &
pnpm test-storybook --url http://localhost:6006
```

**Everything in one go (the CI gate):**
```bash
pnpm test:all       # typecheck → lint → coverage → build-storybook → test-storybook
```

### Build
```bash
pnpm build          # builds all packages + the Next app
```

> Tip: don't run `pnpm build` while `pnpm dev` is live — the production build overwrites the dev server's `.next` chunks. Stop dev first, or `rm -rf apps/web/.next` and restart.

---

## Try the interesting flows

1. **Optimistic submit** — Employee View → request 2 PTO days → the available count drops instantly and a `PENDING` request appears.
2. **Approve with verify** — Manager View → approve it → the balance eases down to the confirmed value; no jerk, no false approval.
3. **Sick leave** — Employee View → **Sick Leave** tab → submit → it shows up separately in the Manager queue.
4. **Bonus mid-session** — Manager View → grant a bonus to Maya's PTO → switch to Employee View → the balance reconciles to the new total, pending hold intact.
5. **Switch employee** — Employee View → use the dropdown → Alex has **zero** leaves (the empty/zero state).

---

## Architecture

Monorepo (pnpm workspaces + Turborepo). Full diagrams and the dependency-direction reasoning are in the **[TRD §5](./docs/TRD.md)**.

```text
apps/
  web/                    # Next.js App Router: employee + manager views
    app/api/hcm/*         #   route handlers: balance, corpus, fault, trigger/anniversary
    app/providers.tsx     #   QueryClient + demo request seed
    lib/                  #   demo-seed (balances) + directory (names/roster)
packages/
  contracts/              # Zod schemas + inferred types — the single contract source
  hcm-mock/               # HcmStore core + fault injection — imported by BOTH web and testing
  data-layer/             # TanStack Query hooks: corpus, balance, submit, decide, trigger…
  ui/                     # presentational components + Storybook stories (the state matrix)
  testing/                # MSW handlers (wrap hcm-mock) + fixtures + test utils
  config/                 # shared tsconfig / eslint / vitest
```

**Key boundary:** `ui` and `data-layer` reach HCM **only over the network** (`fetch /api/hcm/*`); only `apps/web` and `packages/testing` import `hcm-mock` — and they import the *same* one, so the live app and the test harness can't drift.

### Data-layer hooks
`useCorpus` (bulk hydration, version-guarded) · `useBalance` (authoritative per-cell) · `usePendingHold` (optimistic overlay) · `useRequests` · `useSubmitRequest` · `useDecideRequest` (write → verify → reconcile) · `useDecisionContext` (fresh-on-mount) · `useTriggerAnniversary` (bonus grant).

---

## Testing approach

Each test type guards a deliberately different class of regression (defended in the **[TRD §9](./docs/TRD.md)**):

- **Integration tests (highest value)** — data layer through real hooks against MSW + `hcm-mock`. Guard reconciliation/optimistic logic: silent-wrong caught by verify, rollback on insufficient balance, version conflicts, the mid-flight-refresh race, and the corpus-no-downgrade guard.
- **Storybook interaction tests** — guard user-visible state transitions for every row of the state matrix.
- **Unit tests** — pure logic in isolation: balance math, staleness derivation.
- **Types** — Zod-derived; the cheapest guard; CI fails on `tsc`.

Current suite: **all green** — contracts (29), hcm-mock (30), testing (13), data-layer (25), web routes (13), plus the Storybook play tests.

---

## Decisions made (full record in the TRD)

| Decision | Choice | Where |
|---|---|---|
| Server state | **TanStack Query**, not Redux (truth lives in HCM, not in a store we reduce) | [TRD §6.1](./docs/TRD.md) |
| Boundary validation | **Zod** — value-checks untrusted `200 OK`, one source for runtime + types | [TRD §6.2](./docs/TRD.md) |
| Live API transport | **Next.js route handlers + Zod** over one `hcm-mock`; **MSW** as the test transport | [TRD §6.2](./docs/TRD.md) |
| Manager approval | **Confirmed-write + verify** (never optimistic about an outcome) | [TRD §4](./docs/TRD.md) |
| Request entities | **Client state** today (per-window); shared server store on the roadmap | [TRD §11](./docs/TRD.md) |
| `staleTime` | **30s** (tuned down to test reconciliation; production tunes up + adds push) | [TRD §10](./docs/TRD.md) |
| Mock persistence | **In-memory**, deliberately (deterministic faults, single-command run) | [TRD §11](./docs/TRD.md) |

---

## Repo guide

| File | Purpose |
|---|---|
| `docs/TRD.md` | **Technical Requirements Document** — decisions, architecture, diagrams, local-vs-live |
| `ExampleHR-TimeOff-Frontend-BRIEF.md` | Full engineering spec / requirements |
| `CLAUDE.md` | Agent build conventions, guardrails, git workflow |
| `README.md` | This file — how to run, test, and what's in the app |
