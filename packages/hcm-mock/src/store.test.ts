import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { HcmStore } from "./store";

let store: HcmStore;

beforeEach(() => {
  store = new HcmStore();
});

afterEach(() => {
  store.stopAllTimers();
  vi.useRealTimers();
});

// ─── Per-cell read ───────────────────────────────────────────────────────────

describe("readBalance", () => {
  it("returns zero balance for a cell that has never been written (vivify)", async () => {
    const result = await store.readBalance("emp1", "loc1", "PTO");
    expect(result).toMatchObject({
      employeeId: "emp1",
      locationId: "loc1",
      policy: "PTO",
      available: 0,
      version: 0,
    });
    expect(result.asOf).toBeTruthy();
  });

  it("returns the seeded balance", async () => {
    store.seed([
      { employeeId: "emp1", locationId: "loc1", policy: "PTO", available: 10, version: 3 },
    ]);
    const result = await store.readBalance("emp1", "loc1", "PTO");
    expect(result.available).toBe(10);
    expect(result.version).toBe(3);
  });

  it("returns the value set via setBalance", async () => {
    store.setBalance("emp1", "loc1", 20, "SICK");
    const result = await store.readBalance("emp1", "loc1", "SICK");
    expect(result.available).toBe(20);
  });

  it("adds 500ms latency when fault=latency", async () => {
    vi.useFakeTimers();
    store.setFault("emp1:loc1:PTO", "latency");
    const p = store.readBalance("emp1", "loc1", "PTO");
    vi.advanceTimersByTime(499);
    let done = false;
    p.then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    vi.advanceTimersByTime(1);
    await p;
    expect(done).toBe(true);
  });
});

// ─── Per-cell write ──────────────────────────────────────────────────────────

describe("writeBalance — happy path", () => {
  it("decrements balance and bumps version", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result).toMatchObject({
      ok: true,
      balance: { available: 7, version: 1 },
    });
  });

  it("increments balance (accrue path)", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 5, version: 2 }]);
    const result = await store.writeBalance("e", "l", "PTO", 5, 2);
    expect(result).toMatchObject({ ok: true, balance: { available: 10, version: 3 } });
  });

  it("round-trips: read → write → read matches", async () => {
    store.setBalance("emp1", "loc1", 15);
    const before = await store.readBalance("emp1", "loc1", "PTO");
    const write = await store.writeBalance("emp1", "loc1", "PTO", -5, before.version);
    expect(write.ok).toBe(true);
    const after = await store.readBalance("emp1", "loc1", "PTO");
    expect(after.available).toBe(10);
    expect(after.version).toBe(before.version + 1);
  });
});

describe("writeBalance — validation errors", () => {
  it("rejects with VERSION_CONFLICT when version is wrong", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 1 }]);
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result).toEqual({ ok: false, conflict: "VERSION_CONFLICT" });
  });

  it("rejects with INSUFFICIENT_BALANCE when delta would go negative", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 2, version: 0 }]);
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
  });

  it("allows write that brings balance to exactly zero", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 3, version: 0 }]);
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result).toMatchObject({ ok: true, balance: { available: 0, version: 1 } });
  });
});

// ─── Fault injection ─────────────────────────────────────────────────────────

describe("fault: silent-failure", () => {
  it("returns ok:true with no balance field and does NOT apply delta", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setFault("e:l:PTO", "silent-failure");
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result).toEqual({ ok: true });
    expect((result as { balance?: unknown }).balance).toBeUndefined();
    // Balance unchanged
    const bal = await store.readBalance("e", "l", "PTO");
    expect(bal.available).toBe(10);
  });
});

describe("fault: silent-wrong", () => {
  it("returns ok:true with stale balance (delta NOT applied)", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setFault("e:l:PTO", "silent-wrong");
    const result = await store.writeBalance("e", "l", "PTO", -3, 0);
    expect(result.ok).toBe(true);
    expect(result.balance?.available).toBe(10); // stale — not 7
    expect(result.balance?.version).toBe(0);
    // Balance truly unchanged in store
    const bal = await store.readBalance("e", "l", "PTO");
    expect(bal.available).toBe(10);
  });

  it("fault wins over version check — wrong version but fault fires first", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 2 }]);
    store.setFault("e:l:PTO", "silent-wrong");
    // Pass wrong version 999; fault should fire before validation
    const result = await store.writeBalance("e", "l", "PTO", -3, 999);
    expect(result.ok).toBe(true);
    expect(result.balance?.available).toBe(10);
  });
});

describe("fault: conflict", () => {
  it("returns INSUFFICIENT_BALANCE regardless of actual balance", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 100, version: 0 }]);
    store.setFault("e:l:PTO", "conflict");
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
  });
});

describe("fault: latency on write", () => {
  it("adds 500ms delay before returning", async () => {
    vi.useFakeTimers();
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setFault("e:l:PTO", "latency");
    const p = store.writeBalance("e", "l", "PTO", -1, 0);
    vi.advanceTimersByTime(499);
    let done = false;
    p.then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    vi.advanceTimersByTime(1);
    await p;
    expect(done).toBe(true);
  });
});

// ─── Fault prefix matching ────────────────────────────────────────────────────

describe("fault prefix resolution", () => {
  it("emp:loc prefix matches all policies for that employee+location", async () => {
    store.seed([
      { employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 },
      { employeeId: "e", locationId: "l", policy: "SICK", available: 5, version: 0 },
    ]);
    store.setFault("e:l", "silent-failure");
    const r1 = await store.writeBalance("e", "l", "PTO", -1, 0);
    const r2 = await store.writeBalance("e", "l", "SICK", -1, 0);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
  });

  it("emp-only prefix matches all locations for that employee", async () => {
    store.seed([
      { employeeId: "e", locationId: "locA", policy: "PTO", available: 10, version: 0 },
      { employeeId: "e", locationId: "locB", policy: "PTO", available: 10, version: 0 },
    ]);
    store.setFault("e", "conflict");
    const r1 = await store.writeBalance("e", "locA", "PTO", -1, 0);
    const r2 = await store.writeBalance("e", "locB", "PTO", -1, 0);
    expect(r1).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
    expect(r2).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
  });

  it("exact key takes precedence over prefix", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setFault("e:l", "conflict");
    store.setFault("e:l:PTO", "silent-failure"); // exact should win
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result).toEqual({ ok: true }); // silent-failure, not conflict
  });

  it("clearFault removes the key so normal path resumes", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setFault("e:l:PTO", "conflict");
    store.clearFault("e:l:PTO");
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result.ok).toBe(true);
  });
});

// ─── Corpus read ─────────────────────────────────────────────────────────────

describe("readCorpus", () => {
  it("returns all seeded cells", async () => {
    store.seed([
      { employeeId: "e1", locationId: "l1", policy: "PTO", available: 10, version: 1 },
      { employeeId: "e2", locationId: "l2", policy: "SICK", available: 5, version: 0 },
    ]);
    const corpus = await store.readCorpus({ latencyMs: 0 });
    expect(corpus).toHaveLength(2);
    const ptoEntry = corpus.find((c) => c.employeeId === "e1");
    expect(ptoEntry).toMatchObject({ available: 10, policy: "PTO" });
  });

  it("returns empty array when no cells exist", async () => {
    const corpus = await store.readCorpus({ latencyMs: 0 });
    expect(corpus).toEqual([]);
  });

  it("vivified cell from readBalance appears in corpus", async () => {
    await store.readBalance("e1", "l1", "PTO");
    const corpus = await store.readCorpus({ latencyMs: 0 });
    expect(corpus).toHaveLength(1);
    expect(corpus[0]).toMatchObject({ employeeId: "e1", available: 0 });
  });
});

// ─── Anniversary bonus ────────────────────────────────────────────────────────

describe("triggerAnniversary", () => {
  it("bumps available and version", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.triggerAnniversary("e", "l", "PTO", 5);
    const result = await store.readBalance("e", "l", "PTO");
    expect(result.available).toBe(15);
    expect(result.version).toBe(1);
  });

  it("multiple triggers accumulate correctly", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 0, version: 0 }]);
    store.triggerAnniversary("e", "l", "PTO", 3);
    store.triggerAnniversary("e", "l", "PTO", 3);
    const result = await store.readBalance("e", "l", "PTO");
    expect(result.available).toBe(6);
    expect(result.version).toBe(2);
  });

  it("works on a cell that has never been seeded (vivify)", () => {
    store.triggerAnniversary("new", "loc", "PTO", 8);
  });
});

describe("startAnniversaryTimer", () => {
  it("fires on interval and can be stopped", async () => {
    vi.useFakeTimers();
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 0, version: 0 }]);
    const stop = store.startAnniversaryTimer("e", "l", "PTO", 5, 1000);

    vi.advanceTimersByTime(2500);
    // Should have fired twice
    const bal = await store.readBalance("e", "l", "PTO");
    expect(bal.available).toBe(10);

    stop();
    vi.advanceTimersByTime(2000);
    const balAfterStop = await store.readBalance("e", "l", "PTO");
    expect(balAfterStop.available).toBe(10); // no more increments
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("clears all cells, faults, and probabilistic faults", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 100, version: 5 }]);
    store.setFault("e:l:PTO", "conflict");
    store.setProbabilisticFault("silent-failure", 1.0);
    store.reset();

    const corpus = await store.readCorpus({ latencyMs: 0 });
    expect(corpus).toHaveLength(0);

    // After reset, normal write should succeed (no faults)
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    // Cell is vivified at 0, so -1 is INSUFFICIENT_BALANCE, but no fault fires
    expect(result).toEqual({ ok: false, conflict: "INSUFFICIENT_BALANCE" });
  });
});

// ─── Probabilistic faults ────────────────────────────────────────────────────

describe("setProbabilisticFault", () => {
  it("at probability=1.0 always fires", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setProbabilisticFault("silent-failure", 1.0);
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result).toEqual({ ok: true });
    expect((result as { balance?: unknown }).balance).toBeUndefined();
  });

  it("at probability=0 never fires", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setProbabilisticFault("conflict", 0);
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result.ok).toBe(true);
  });

  it("clearProbabilisticFaults stops all probabilistic faults", async () => {
    store.seed([{ employeeId: "e", locationId: "l", policy: "PTO", available: 10, version: 0 }]);
    store.setProbabilisticFault("silent-failure", 1.0);
    store.clearProbabilisticFaults();
    const result = await store.writeBalance("e", "l", "PTO", -1, 0);
    expect(result.ok).toBe(true);
    expect(result.balance?.available).toBe(9); // actually applied
  });
});
