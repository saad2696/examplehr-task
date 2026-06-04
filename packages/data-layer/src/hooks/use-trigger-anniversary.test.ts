import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { hcmStore } from "@repo/hcm-mock";
import { useTriggerAnniversary } from "./use-trigger-anniversary";
import { useBalance } from "./use-balance";
import { TestQueryWrapper, testQueryClient } from "../test-utils";
import { QUERY_KEYS } from "../query-keys";

describe("useTriggerAnniversary", () => {
  it("grants a bonus and refetches the per-cell balance to the new total", async () => {
    hcmStore.setBalance("emp-anniv", "loc1", 10, "PTO");

    const { result: bal } = renderHook(
      () => useBalance("emp-anniv", "loc1", "PTO"),
      { wrapper: TestQueryWrapper },
    );
    await waitFor(() => expect(bal.current.data?.available).toBe(10));

    const { result } = renderHook(() => useTriggerAnniversary(), {
      wrapper: TestQueryWrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        employeeId: "emp-anniv",
        locationId: "loc1",
        policy: "PTO",
        bonus: 5,
      });
    });

    await waitFor(() => expect(bal.current.data?.available).toBe(15));
  });

  it("leaves the pendingHold overlay untouched so available − hold recomputes", async () => {
    hcmStore.setBalance("emp-hold", "loc1", 10, "PTO");
    testQueryClient.setQueryData(QUERY_KEYS.pendingHold("emp-hold", "loc1", "PTO"), 4);

    const { result } = renderHook(() => useTriggerAnniversary(), {
      wrapper: TestQueryWrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        employeeId: "emp-hold",
        locationId: "loc1",
        policy: "PTO",
        bonus: 6,
      });
    });

    expect(
      testQueryClient.getQueryData(QUERY_KEYS.pendingHold("emp-hold", "loc1", "PTO")),
    ).toBe(4);
  });
});
