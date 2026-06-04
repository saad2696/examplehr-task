# ExampleHR — Time-Off Frontend

A frontend for requesting and approving time off, where the **balances are owned by an external HCM system** (Workday/SAP class) that ExampleHR doesn't control. The whole challenge is presenting those balances so they feel *instant and trustworthy* while staying honest that the numbers live somewhere else and can change — or be wrong — underneath us.

> This README documents **how I reached the solution and the challenges I hit along the way**. The full engineering spec is in [`ExampleHR-TimeOff-Frontend-BRIEF.md`](./ExampleHR-TimeOff-Frontend-BRIEF.md); agent build conventions are in [`CLAUDE.md`](./CLAUDE.md); the decision record is in the TRD.

<!-- FILL after deploy -->
- **Live Storybook:** <!-- e.g. https://…chromatic.com -->
- **Live app:** <!-- e.g. https://…vercel.app -->
- **Repo:** <!-- github url -->

---

## Quick start

```bash
pnpm install
pnpm dev          # the Next.js app
pnpm storybook    # the state matrix (the real proof of behavior)
pnpm test         # unit + integration + interaction tests
```

This is a **pnpm + Turborepo monorepo**. See [Architecture](#architecture) for the package layout.

---

## The problem in one paragraph

If an employee sees "10 days available" and requests 2, the UI must respond instantly — but the HCM might reject the write, or the "10" might already be stale because HCM granted a work-anniversary bonus thirty seconds ago. Worse, HCM *usually* returns a clean error on an invalid/insufficient request, but **not always** — a `200 OK` can still be wrong. The non-negotiable UX rule that falls out of this: an employee must **never** be told "approved" and then later "actually, denied."

---

## How I reached the solution

I worked backwards from that one hard rule — *never reverse a stated outcome* — and let it drive every other decision.

**1. I separated "intent" from "outcome."** Showing a request as `PENDING` instantly is honest: it reflects what the user *did*, not a result HCM hasn't confirmed. So submission is optimistic. But *approval* triggers the real HCM write, and an outcome there can't be asserted until HCM confirms it. That split — optimistic about intent, pessimistic about outcome — is the spine of the design. (Brief §6.)

**2. I stopped trusting `200 OK`.** Because HCM can silently lie, every state-changing write is immediately followed by an **authoritative per-cell re-read**. If the re-read contradicts the success response, the request drops to a recoverable `NEEDS_ATTENTION` state instead of silently flipping. This "verify, don't trust" loop is what makes the silent-wrong case survivable. (Brief §6, sequence diagram in §5.5.)

**3. I picked tools that model "source of truth lives elsewhere" natively.** TanStack Query gives stale-while-revalidate, background refetch, query invalidation, and optimistic mutations with rollback out of the box — so I'm not hand-rolling the hard parts. Zod validates *and value-checks* HCM responses at the boundary, which is the concrete mechanism behind "assume success can be wrong." (Brief §5.)

**4. I made the optimistic update an overlay, not a cache mutation.** The single subtlest bug in this kind of app is a background refresh landing mid-action and wiping the user's optimistic state. Keeping the optimistic change as a snapshot applied in `onMutate` (and removed only on error), layered on top of server cache, means a refetch updates the base numbers underneath while the in-flight action stays intact. (Brief §7.)

**5. I chose a monorepo for one specific reason.** The most important correctness property is *"the live app and the test harness must behave identically."* In a single package that's a hope; as a monorepo it's a build-enforced dependency edge — `apps/web` route handlers and the MSW test handlers both import the same `packages/hcm-mock`, so there is no second copy to drift. (Brief §5.6.)

---

## Challenges faced (and how I handled each)

| Challenge | Why it's hard | How I solved it |
|---|---|---|
| **External mutation** (anniversary bonus / year-start refresh lands while the app is open) | The displayed balance changes from outside the app and can't be allowed to surprise the user mid-action | Periodic + on-refocus reconciliation from the batch corpus; optimistic changes kept as overlays so a refresh never clobbers an in-flight request; a non-blocking banner when a refresh materially changes a balance the user is acting on |
| **Authoritative read vs. expensive batch read** | One cheap-but-narrow real-time cell read; one correct-but-expensive corpus read | Corpus only for hydration + slow periodic reconciliation; per-cell read for anything authoritative (decision-time, post-write verify). Codified the cadences in the cache strategy |
| **Unreliable success (`200 OK` can be wrong)** | A success response may not reflect reality | Zod sanity-checks values (not just shape) at the boundary; every write is followed by a per-cell re-read; contradictions become recoverable `NEEDS_ATTENTION`, never silent reversals |
| **"Approved → later denied" must never happen** | Two actors (employee submits, manager approves) and a write that can fail | Optimistic for intent (`PENDING`) but confirmed/guarded for outcome (`APPROVING → APPROVED` only after verify); rollback path is always to a recoverable state with a clear message |
| **Multi-row balances (per-employee, per-location)** | A single employee has several independent cells | Query keys are per-cell (`['balance', employeeId, locationId]`); UI is multi-row aware; invalidation is surgical (one cell), corpus refresh is the wide net |
| **Reconciling a background refresh with an in-flight action** | The classic optimistic-UI race | `onMutate` snapshot + overlay, base cache free to update from refetch, `onSettled` invalidate + re-read, `onError` rolls back the overlay only |
| **Proving the states, not just the happy path** | Easy to demo success, hard to demo failure modes | Every meaningful state (loading, empty, stale, optimistic-pending, rolled-back, HCM-rejected, silently-wrong, refreshed-mid-session) is a Storybook story with faults pinned deterministically; the hard ones have interaction tests |
| **Stack temptation: should the mock HCM use a real DB?** | A real DB feels "more realistic" | I deliberately kept the mock in-memory: Storybook can't reach Postgres anyway, faults need to be deterministic per scenario, and "single command to run" matters. (Reasoning recorded in the TRD.) <!-- update if Neon adapter was added --> |

---

## Architecture

Monorepo (pnpm workspaces + Turborepo). Full diagrams in the [brief §5.5–§5.6](./ExampleHR-TimeOff-Frontend-BRIEF.md).

```text
apps/
  web/                # Next.js App Router: employee + manager views, /api/hcm/* route handlers
packages/
  contracts/          # Zod schemas + inferred types — the single contract source
  hcm-mock/           # HcmStore core + fault injection — imported by BOTH web and testing
  data-layer/         # TanStack Query hooks: optimistic + verify + reconcile
  ui/                 # presentational components + Storybook stories (the state matrix)
  testing/            # MSW handlers (wrap hcm-mock) + fixtures + test utils
  config/             # shared tsconfig / eslint / vitest
```

Key boundary: `ui` and `data-layer` reach HCM **only over the network** (`fetch /api/hcm/*`); only `apps/web` and `packages/testing` import `hcm-mock` — which keeps the "truth is remote" boundary honest in the code structure itself.

---

## Testing approach

Each test type guards a deliberately different class of regression (defended in the TRD):

- **Integration tests (highest value)** — data layer through real hooks against MSW + `hcm-mock`. Guard the reconciliation/optimistic logic: silent-wrong caught by verify, rollback on insufficient balance, version conflicts, and the mid-flight-refresh race.
- **Storybook interaction tests** — guard user-visible state transitions for every row of the state matrix.
- **Unit tests** — pure logic in isolation: balance math, staleness derivation, the request-status reducer.
- **Types** — Zod-derived; the cheapest guard; CI fails on `tsc`.

<!-- FILL after build -->
- **Coverage:** <!-- e.g. 92% lines, link to report -->
- **State matrix:** <!-- link to deployed Storybook -->

---

## Trade-offs & what I'd do with more time

- **Monorepo overhead** is real for a project this size; I took it on specifically to enforce the shared-mock boundary. For a true single-team production app I'd weigh it against a single package with strict lint rules.
- **Manager-approval pattern** (confirmed-write vs optimistic-with-guard) is a genuine fork; the TRD records which I chose and why. <!-- state the choice -->
- **Request entities** are modeled as <!-- client state / mock ExampleHR backend --> — a fuller build would give them their own persistence.
- **Next:** richer reconciliation telemetry, real-time push from HCM (vs polling), and per-policy balance rules.

---

## Repo guide

| File | Purpose |
|---|---|
| `ExampleHR-TimeOff-Frontend-BRIEF.md` | Full engineering spec / requirements |
| `CLAUDE.md` | Agent build conventions, guardrails, git workflow |
| `docs/TRD.md` | Decision record: optimistic-vs-pessimistic, cache strategy, alternatives <!-- create --> |
| `README.md` | This file — solution narrative + challenges |
