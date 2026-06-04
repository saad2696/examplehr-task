import type { Balance, HcmWriteResult, FaultType } from "@repo/contracts";

interface Cell {
  available: number;
  version: number;
}

// ─── HcmStore ─────────────────────────────────────────────────────────────────

export class HcmStore {
  private cells = new Map<string, Cell>();
  private faults = new Map<string, FaultType>();
  // Probabilistic faults for the live demo — not for tests.
  private probFaults: Array<{ fault: FaultType; probability: number }> = [];
  private timers: ReturnType<typeof setInterval>[] = [];

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private cellKey(
    employeeId: string,
    locationId: string,
    policy: string
  ): string {
    return `${employeeId}:${locationId}:${policy}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Fault resolution order:
   *   1. Exact key  "emp:loc:policy"
   *   2. Two-part   "emp:loc"        — useful for pinning a fault across all policies
   *   3. One-part   "emp"            — employee-wide fault
   *   4. Probabilistic               — for the live demo
   */
  private resolveFault(key: string): FaultType {
    const exact = this.faults.get(key);
    if (exact && exact !== "none") return exact;

    const parts = key.split(":");
    if (parts.length === 3) {
      const p2 = this.faults.get(`${parts[0]}:${parts[1]}`);
      if (p2 && p2 !== "none") return p2;

      const p1 = this.faults.get(parts[0]!);
      if (p1 && p1 !== "none") return p1;
    }

    for (const { fault, probability } of this.probFaults) {
      if (Math.random() < probability) return fault;
    }

    return "none";
  }

  /** Vivify: auto-creates a cell with {available:0, version:0} on first touch. */
  private vivify(key: string): Cell {
    if (!this.cells.has(key)) {
      this.cells.set(key, { available: 0, version: 0 });
    }
    return this.cells.get(key)!;
  }

  // ─── Seed / reset ───────────────────────────────────────────────────────────

  seed(
    rows: Array<{
      employeeId: string;
      locationId: string;
      policy: string;
      available: number;
      version?: number;
    }>
  ): this {
    for (const r of rows) {
      this.cells.set(this.cellKey(r.employeeId, r.locationId, r.policy), {
        available: r.available,
        version: r.version ?? 0,
      });
    }
    return this;
  }

  /**
   * Direct balance setter for test setup — bypasses write validation.
   * Default policy is 'PTO' for test-ergonomics only, not a HCM semantic.
   */
  setBalance(
    employeeId: string,
    locationId: string,
    available: number,
    policy = "PTO"
  ): void {
    const k = this.cellKey(employeeId, locationId, policy);
    const existing = this.cells.get(k);
    this.cells.set(k, {
      available,
      version: (existing?.version ?? 0) + 1,
    });
  }

  reset(): void {
    this.cells.clear();
    this.clearFaults();
    this.clearProbabilisticFaults();
    this.stopAllTimers();
  }

  // ─── Fault management ───────────────────────────────────────────────────────

  setFault(key: string, fault: FaultType): void {
    this.faults.set(key, fault);
  }

  clearFault(key: string): void {
    this.faults.delete(key);
  }

  clearFaults(): void {
    this.faults.clear();
  }

  /** Probabilistic faults: used in the live demo for "occasional" misbehavior. */
  setProbabilisticFault(fault: FaultType, probability: number): void {
    this.probFaults = this.probFaults.filter((f) => f.fault !== fault);
    this.probFaults.push({ fault, probability });
  }

  clearProbabilisticFaults(): void {
    this.probFaults = [];
  }

  // ─── Reads ──────────────────────────────────────────────────────────────────

  /** Authoritative per-cell read. Auto-vivifies the cell on first access. */
  async readBalance(
    employeeId: string,
    locationId: string,
    policy: string
  ): Promise<Balance> {
    const k = this.cellKey(employeeId, locationId, policy);
    const fault = this.resolveFault(k);

    if (fault === "latency") await sleep(500);

    const cell = this.vivify(k);

    return {
      employeeId,
      locationId,
      policy,
      available: cell.available,
      asOf: this.now(),
      version: cell.version,
    };
  }

  /**
   * Batch corpus read — intentionally slow (simulates the expensive HCM call).
   * Pass latencyMs: 0 in tests to skip the wait.
   */
  async readCorpus(options?: { latencyMs?: number }): Promise<Balance[]> {
    await sleep(options?.latencyMs ?? 800);
    return Array.from(this.cells.entries()).map(([k, cell]) => {
      const [employeeId, locationId, policy] = k.split(":") as [
        string,
        string,
        string,
      ];
      return {
        employeeId,
        locationId,
        policy,
        available: cell.available,
        asOf: this.now(),
        version: cell.version,
      };
    });
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

  /**
   * Single-cell write (decrement on approval).
   *
   * Fault-injection order — faults are evaluated BEFORE version / balance checks:
   *   silent-failure  → no-op, return { ok: true } (no balance field)
   *   silent-wrong    → no-op, return { ok: true, balance: <stale> }
   *                     NOTE: the verify step in data-layer detects this via delta
   *                     math (requested delta ≠ actual change), NOT via asOf.
   *   conflict        → force { ok: false, conflict: 'INSUFFICIENT_BALANCE' }
   *   latency         → add 500 ms, then proceed normally
   */
  async writeBalance(
    employeeId: string,
    locationId: string,
    policy: string,
    delta: number,
    version: number
  ): Promise<HcmWriteResult> {
    const k = this.cellKey(employeeId, locationId, policy);
    const fault = this.resolveFault(k);

    if (fault === "latency") await sleep(500);

    if (fault === "silent-failure") {
      return { ok: true };
    }

    if (fault === "silent-wrong") {
      const cell = this.cells.get(k) ?? { available: 0, version: 0 };
      return {
        ok: true,
        balance: {
          employeeId,
          locationId,
          policy,
          available: cell.available, // stale — delta was NOT applied
          asOf: this.now(),
          version: cell.version,
        },
      };
    }

    if (fault === "conflict") {
      return { ok: false, conflict: "INSUFFICIENT_BALANCE" };
    }

    // Normal path — validate + apply.
    const cell = this.vivify(k);

    if (version !== cell.version) {
      return { ok: false, conflict: "VERSION_CONFLICT" };
    }

    const newAvailable = cell.available + delta;
    if (newAvailable < 0) {
      return { ok: false, conflict: "INSUFFICIENT_BALANCE" };
    }

    const updated: Cell = {
      available: newAvailable,
      version: cell.version + 1,
    };
    this.cells.set(k, updated);

    return {
      ok: true,
      balance: {
        employeeId,
        locationId,
        policy,
        available: updated.available,
        asOf: this.now(),
        version: updated.version,
      },
    };
  }

  // ─── Anniversary bonus ──────────────────────────────────────────────────────

  /** Deterministic trigger — used by tests and Storybook stories. */
  triggerAnniversary(
    employeeId: string,
    locationId: string,
    policy: string,
    bonus: number
  ): void {
    const k = this.cellKey(employeeId, locationId, policy);
    const cell = this.vivify(k);
    this.cells.set(k, {
      available: cell.available + bonus,
      version: cell.version + 1,
    });
  }

  /**
   * Optional timer mode for the live demo — bumps a cell on an interval.
   * NOT used in tests or stories (use triggerAnniversary for those).
   * Returns a stop function.
   */
  startAnniversaryTimer(
    employeeId: string,
    locationId: string,
    policy: string,
    bonus: number,
    intervalMs: number
  ): () => void {
    const id = setInterval(() => {
      this.triggerAnniversary(employeeId, locationId, policy, bonus);
    }, intervalMs);
    this.timers.push(id);
    return () => {
      clearInterval(id);
      this.timers = this.timers.filter((t) => t !== id);
    };
  }

  stopAllTimers(): void {
    for (const id of this.timers) clearInterval(id);
    this.timers = [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Singleton used by route handlers and MSW handlers. Tests use `new HcmStore()`. */
export const hcmStore = new HcmStore();
