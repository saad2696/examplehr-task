import { describe, it, expect } from "vitest";
import {
  BalanceSchema,
  TimeOffRequestSchema,
  HcmWriteResultSchema,
  RequestStatusSchema,
  ConflictTypeSchema,
  FaultTypeSchema,
  BalanceWriteBodySchema,
  AnniversaryTriggerBodySchema,
} from "./index";

const validBalance = {
  employeeId: "emp-1",
  locationId: "loc-us",
  policy: "PTO",
  available: 10,
  asOf: "2024-01-15T09:00:00Z",
  version: 3,
};

const validRequest = {
  id: "req-1",
  employeeId: "emp-1",
  locationId: "loc-us",
  policy: "PTO",
  days: 2,
  status: "PENDING" as const,
  submittedAt: "2024-01-15T09:00:00Z",
};

describe("BalanceSchema", () => {
  it("accepts a valid balance", () => {
    expect(() => BalanceSchema.parse(validBalance)).not.toThrow();
  });

  it("rejects negative available (value-invalid despite correct shape)", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, available: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts zero available (no days left is valid)", () => {
    expect(() =>
      BalanceSchema.parse({ ...validBalance, available: 0 })
    ).not.toThrow();
  });

  it("rejects negative version", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, version: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer version", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, version: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects empty employeeId", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, employeeId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty locationId", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, locationId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty policy", () => {
    const result = BalanceSchema.safeParse({ ...validBalance, policy: "" });
    expect(result.success).toBe(false);
  });

  it("infers correct TypeScript type", () => {
    const balance = BalanceSchema.parse(validBalance);
    const _check: { available: number; version: number } = balance;
    expect(_check.available).toBe(10);
  });
});

describe("TimeOffRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(() => TimeOffRequestSchema.parse(validRequest)).not.toThrow();
  });

  it("accepts optional decidedAt", () => {
    expect(() =>
      TimeOffRequestSchema.parse({
        ...validRequest,
        decidedAt: "2024-01-16T09:00:00Z",
      })
    ).not.toThrow();
  });

  it("accepts optional balanceContext", () => {
    expect(() =>
      TimeOffRequestSchema.parse({
        ...validRequest,
        balanceContext: { available: 10, asOf: "2024-01-15T09:00:00Z" },
      })
    ).not.toThrow();
  });

  it("rejects zero days (must be positive)", () => {
    const result = TimeOffRequestSchema.safeParse({ ...validRequest, days: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative days", () => {
    const result = TimeOffRequestSchema.safeParse({
      ...validRequest,
      days: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status string", () => {
    const result = TimeOffRequestSchema.safeParse({
      ...validRequest,
      status: "UNKNOWN_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid status values", () => {
    const statuses = [
      "PENDING",
      "APPROVING",
      "APPROVED",
      "DENIED",
      "NEEDS_ATTENTION",
      "ROLLED_BACK",
    ] as const;
    for (const status of statuses) {
      expect(() =>
        TimeOffRequestSchema.parse({ ...validRequest, status })
      ).not.toThrow();
    }
  });
});

describe("HcmWriteResultSchema", () => {
  it("accepts a successful write result", () => {
    expect(() =>
      HcmWriteResultSchema.parse({ ok: true, balance: validBalance })
    ).not.toThrow();
  });

  it("accepts a conflict result", () => {
    expect(() =>
      HcmWriteResultSchema.parse({
        ok: false,
        conflict: "INSUFFICIENT_BALANCE",
      })
    ).not.toThrow();
  });

  it("accepts ok:true with no balance (silent-failure scenario)", () => {
    expect(() =>
      HcmWriteResultSchema.parse({ ok: true })
    ).not.toThrow();
  });

  it("rejects invalid conflict type", () => {
    const result = HcmWriteResultSchema.safeParse({
      ok: false,
      conflict: "NOT_A_REAL_CONFLICT",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a balance with negative available (value check at boundary)", () => {
    const result = HcmWriteResultSchema.safeParse({
      ok: true,
      balance: { ...validBalance, available: -5 },
    });
    expect(result.success).toBe(false);
  });
});

describe("RequestStatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const s of RequestStatusSchema.options) {
      expect(() => RequestStatusSchema.parse(s)).not.toThrow();
    }
  });
});

describe("ConflictTypeSchema", () => {
  it("accepts all valid conflict types", () => {
    for (const c of ConflictTypeSchema.options) {
      expect(() => ConflictTypeSchema.parse(c)).not.toThrow();
    }
  });
});

describe("FaultTypeSchema", () => {
  it("accepts all valid fault types", () => {
    for (const f of FaultTypeSchema.options) {
      expect(() => FaultTypeSchema.parse(f)).not.toThrow();
    }
  });
});

describe("BalanceWriteBodySchema", () => {
  it("accepts a valid write body", () => {
    expect(() =>
      BalanceWriteBodySchema.parse({
        employeeId: "emp-1",
        locationId: "loc-us",
        policy: "PTO",
        delta: -2,
        version: 3,
      })
    ).not.toThrow();
  });

  it("rejects non-integer version", () => {
    const result = BalanceWriteBodySchema.safeParse({
      employeeId: "emp-1",
      locationId: "loc-us",
      policy: "PTO",
      delta: -2,
      version: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("AnniversaryTriggerBodySchema", () => {
  it("accepts a valid trigger body", () => {
    expect(() =>
      AnniversaryTriggerBodySchema.parse({
        employeeId: "emp-1",
        locationId: "loc-us",
        policy: "PTO",
        bonus: 5,
      })
    ).not.toThrow();
  });

  it("rejects zero bonus", () => {
    const result = AnniversaryTriggerBodySchema.safeParse({
      employeeId: "emp-1",
      locationId: "loc-us",
      policy: "PTO",
      bonus: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative bonus", () => {
    const result = AnniversaryTriggerBodySchema.safeParse({
      employeeId: "emp-1",
      locationId: "loc-us",
      policy: "PTO",
      bonus: -1,
    });
    expect(result.success).toBe(false);
  });
});
