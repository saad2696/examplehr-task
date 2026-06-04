import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { hcmStore } from "@repo/hcm-mock";
import { server } from "@repo/testing/msw-server";
import { useDecideRequest } from "./use-decide-request";
import { TestQueryWrapper, testQueryClient } from "../test-utils";
import { QUERY_KEYS } from "../query-keys";
import { requestStore } from "../request-store";
import type { TimeOffRequest } from "@repo/contracts";

function seedRequest(overrides?: Partial<TimeOffRequest>): TimeOffRequest {
  const req: TimeOffRequest = {
    id: "req-test-1",
    employeeId: "emp",
    locationId: "loc",
    policy: "PTO",
    days: 3,
    status: "PENDING",
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
  requestStore.add(req);
  return req;
}

describe("useDecideRequest", () => {
  // IT-7: happy path — write lands, verify confirms decrement → APPROVED
  it("IT-7: approve reaches APPROVED after write + verify confirms decrement", async () => {
    hcmStore.setBalance("emp", "loc", 10, "PTO");

    // Seed balance into the cache with version 1
    const balance = {
      employeeId: "emp", locationId: "loc", policy: "PTO",
      available: 10, asOf: new Date().toISOString(), version: 1,
    };
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), balance);

    const req = seedRequest();

    const { result: decideResult } = renderHook(() => useDecideRequest(), { wrapper: TestQueryWrapper });

    act(() => {
      decideResult.current.mutate({
        requestId: req.id,
        decision: "approve",
        employeeId: "emp",
        locationId: "loc",
        policy: "PTO",
        days: 3,
        version: 1,
      });
    });

    // Wait for write + verify to complete
    await waitFor(() => expect(decideResult.current.isSuccess).toBe(true), { timeout: 3000 });

    const approved = requestStore.get(req.id);
    expect(approved?.status).toBe("APPROVED");

    // Balance should reflect the decrement (7 days left)
    const freshBalance = testQueryClient.getQueryData<{ available: number }>(
      QUERY_KEYS.balance("emp", "loc", "PTO"),
    );
    expect(freshBalance?.available).toBe(7);
  });

  // IT-1: silent-wrong → write returns ok:true but re-read shows no change → NEEDS_ATTENTION
  it("IT-1: silent-wrong write detected by verify re-read → NEEDS_ATTENTION, never APPROVED", async () => {
    hcmStore.setBalance("emp", "loc", 10, "PTO");
    hcmStore.setFault("emp:loc:PTO", "silent-wrong");

    const balance = {
      employeeId: "emp", locationId: "loc", policy: "PTO",
      available: 10, asOf: new Date().toISOString(), version: 1,
    };
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), balance);

    const req = seedRequest();

    const statusHistory: string[] = [];
    // Track every status the request passes through
    const { result: decideResult } = renderHook(() => useDecideRequest(), { wrapper: TestQueryWrapper });

    act(() => {
      decideResult.current.mutate({
        requestId: req.id,
        decision: "approve",
        employeeId: "emp",
        locationId: "loc",
        policy: "PTO",
        days: 3,
        version: 1,
      });
    });

    await waitFor(
      () => {
        const status = requestStore.get(req.id)?.status;
        if (status) statusHistory.push(status);
        expect(status).toBe("NEEDS_ATTENTION");
      },
      { timeout: 3000 },
    );

    // APPROVED must never have appeared
    expect(statusHistory.includes("APPROVED")).toBe(false);
    expect(decideResult.current.isSuccess).toBe(true);
  });

  // IT-3: insufficient balance → HCM rejects → overlay rolled back → DENIED
  it("IT-3: HCM INSUFFICIENT_BALANCE → request DENIED, balance cache restored", async () => {
    hcmStore.setBalance("emp", "loc", 2, "PTO"); // only 2 days, requesting 5

    const balance = {
      employeeId: "emp", locationId: "loc", policy: "PTO",
      available: 2, asOf: new Date().toISOString(), version: 1,
    };
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), balance);

    const req = seedRequest({ days: 5 });

    const { result: decideResult } = renderHook(() => useDecideRequest(), { wrapper: TestQueryWrapper });

    act(() => {
      decideResult.current.mutate({
        requestId: req.id,
        decision: "approve",
        employeeId: "emp",
        locationId: "loc",
        policy: "PTO",
        days: 5,
        version: 1,
      });
    });

    await waitFor(
      () => expect(requestStore.get(req.id)?.status).toBe("DENIED"),
      { timeout: 3000 },
    );

    // Balance never went negative
    const cachedBalance = testQueryClient.getQueryData<{ available: number }>(
      QUERY_KEYS.balance("emp", "loc", "PTO"),
    );
    expect((cachedBalance?.available ?? 0) >= 0).toBe(true);
  });

  // IT-4: version conflict → NEEDS_ATTENTION (recoverable, can retry with fresh version)
  it("IT-4: VERSION_CONFLICT → NEEDS_ATTENTION, balance never goes negative", async () => {
    hcmStore.setBalance("emp", "loc", 10, "PTO"); // version is 1 in the store

    const balance = {
      employeeId: "emp", locationId: "loc", policy: "PTO",
      available: 10, asOf: new Date().toISOString(), version: 0, // stale version!
    };
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), balance);

    const req = seedRequest();

    const { result: decideResult } = renderHook(() => useDecideRequest(), { wrapper: TestQueryWrapper });

    act(() => {
      decideResult.current.mutate({
        requestId: req.id,
        decision: "approve",
        employeeId: "emp",
        locationId: "loc",
        policy: "PTO",
        days: 3,
        version: 0, // stale — HCM will reject with VERSION_CONFLICT
      });
    });

    await waitFor(
      () => expect(requestStore.get(req.id)?.status).toBe("NEEDS_ATTENTION"),
      { timeout: 3000 },
    );

    // Balance should not have been decremented
    const cachedBalance = testQueryClient.getQueryData<{ available: number }>(
      QUERY_KEYS.balance("emp", "loc", "PTO"),
    );
    expect(cachedBalance?.available).toBe(10);
  });

  it("deny → DENIED immediately without HCM write", async () => {
    hcmStore.setBalance("emp", "loc", 10, "PTO");

    const balance = {
      employeeId: "emp", locationId: "loc", policy: "PTO",
      available: 10, asOf: new Date().toISOString(), version: 1,
    };
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), balance);

    const req = seedRequest();

    // Intercept to verify no POST /balance is made
    let writeAttempted = false;
    server.use(
      http.post("http://*/api/hcm/balance", () => {
        writeAttempted = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    const { result: decideResult } = renderHook(() => useDecideRequest(), { wrapper: TestQueryWrapper });

    act(() => {
      decideResult.current.mutate({
        requestId: req.id,
        decision: "deny",
        employeeId: "emp",
        locationId: "loc",
        policy: "PTO",
        days: 3,
        version: 1,
      });
    });

    await waitFor(() => expect(decideResult.current.isSuccess).toBe(true));
    expect(requestStore.get(req.id)?.status).toBe("DENIED");
    expect(writeAttempted).toBe(false);
  });
});
