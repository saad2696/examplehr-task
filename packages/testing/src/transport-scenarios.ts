import { it, expect, beforeEach } from "vitest";
import { hcmStore } from "@repo/hcm-mock";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const BASE = "http://localhost";

/**
 * Transport-agnostic contract tests. Call inside a describe() with a fetcher
 * that routes requests to the transport under test.
 *
 * The fetcher receives standard fetch arguments. The msw test passes
 * globalThis.fetch (MSW intercepts); the route handler test passes an adapter
 * that dispatches directly to the handler functions.
 */
export function defineTransportScenarios(fetcher: Fetcher) {
  beforeEach(() => hcmStore.reset());

  // ─── Balance read ──────────────────────────────────────────────────────────

  it("GET /api/hcm/balance vivifies a zero balance for a new cell", async () => {
    const res = await fetcher(
      `${BASE}/api/hcm/balance?employeeId=e1&locationId=l1&policy=PTO`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ employeeId: "e1", locationId: "l1", policy: "PTO", available: 0 });
  });

  it("GET /api/hcm/balance returns the seeded balance", async () => {
    hcmStore.seed([{ employeeId: "e1", locationId: "l1", policy: "PTO", available: 15, version: 2 }]);
    const res = await fetcher(
      `${BASE}/api/hcm/balance?employeeId=e1&locationId=l1&policy=PTO`
    );
    const data = await res.json();
    expect(data).toMatchObject({ available: 15, version: 2 });
  });

  it("GET /api/hcm/balance returns 400 for missing params", async () => {
    const res = await fetcher(`${BASE}/api/hcm/balance?employeeId=e1`);
    expect(res.status).toBe(400);
  });

  // ─── Balance write ─────────────────────────────────────────────────────────

  it("POST /api/hcm/balance applies delta and returns updated balance", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", delta: -3, version: 0 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ ok: true, balance: { available: 7, version: 1 } });
  });

  it("POST /api/hcm/balance returns VERSION_CONFLICT on stale version", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 2 }]);
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", delta: -1, version: 0 }),
    });
    const data = await res.json();
    expect(data).toEqual({ ok: false, conflict: "VERSION_CONFLICT" });
  });

  it("POST /api/hcm/balance returns INSUFFICIENT_BALANCE when balance would go negative", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 1, version: 0 }]);
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", delta: -5, version: 0 }),
    });
    const data = await res.json();
    expect(data).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
  });

  it("POST /api/hcm/balance returns 400 for invalid body", async () => {
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bad: "body" }),
    });
    expect(res.status).toBe(400);
  });

  // ─── Fault injection via transport ────────────────────────────────────────

  it("POST /api/hcm/fault + write returns silent-failure ok:true (no balance)", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    await fetcher(`${BASE}/api/hcm/fault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "e:l:PTO", fault: "silent-failure" }),
    });
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", delta: -1, version: 0 }),
    });
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(data.balance).toBeUndefined();
  });

  it("DELETE /api/hcm/fault clears faults so normal path resumes", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    hcmStore.setFault("e:l:PTO", "conflict");
    await fetcher(`${BASE}/api/hcm/fault`, { method: "DELETE" });
    const res = await fetcher(`${BASE}/api/hcm/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", delta: -1, version: 0 }),
    });
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.balance?.available).toBe(9);
  });

  // ─── Corpus read ──────────────────────────────────────────────────────────

  it("GET /api/hcm/corpus returns all seeded cells", async () => {
    hcmStore.seed([
      { employeeId: "e1", locationId: "l1", policy: "PTO", available: 10, version: 0 },
      { employeeId: "e2", locationId: "l2", policy: "SICK", available: 5, version: 1 },
    ]);
    const res = await fetcher(`${BASE}/api/hcm/corpus`);
    expect(res.status).toBe(200);
    const data: unknown[] = await res.json();
    expect(data).toHaveLength(2);
  });

  it("GET /api/hcm/corpus returns empty array when no cells", async () => {
    const res = await fetcher(`${BASE}/api/hcm/corpus`);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  // ─── Anniversary trigger ───────────────────────────────────────────────────

  it("POST /api/hcm/trigger/anniversary bumps the balance", async () => {
    hcmStore.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    const res = await fetcher(`${BASE}/api/hcm/trigger/anniversary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e", locationId: "l", policy: "PTO", bonus: 5 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    // Verify the balance was actually bumped
    const bal = await hcmStore.readBalance("e", "l", "PTO");
    expect(bal.available).toBe(15);
  });

  it("POST /api/hcm/trigger/anniversary returns 400 for invalid body", async () => {
    const res = await fetcher(`${BASE}/api/hcm/trigger/anniversary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "e" }),
    });
    expect(res.status).toBe(400);
  });
}
