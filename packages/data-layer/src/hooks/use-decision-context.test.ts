import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { hcmStore } from "@repo/hcm-mock";
import { useDecisionContext } from "./use-decision-context";
import { TestQueryWrapper, testQueryClient } from "../test-utils";
import { QUERY_KEYS } from "../query-keys";

describe("useDecisionContext", () => {
  // IT-5: stale-at-decision — cache has old value, store has new value.
  // The hook must fire a fresh GET and override the stale cache.
  it("IT-5: fires a fresh per-cell read on mount, overriding stale cached value", async () => {
    // Cache pre-seeded with an older value (as if corpus hydrated 10 min ago)
    const staleAsOf = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp", "loc", "PTO"), {
      employeeId: "emp",
      locationId: "loc",
      policy: "PTO",
      available: 8,
      asOf: staleAsOf,
      version: 1,
    });

    // Real store has been updated externally (e.g. manager approved another request)
    hcmStore.setBalance("emp", "loc", 5, "PTO");

    const { result } = renderHook(
      () => useDecisionContext("emp", "loc", "PTO"),
      { wrapper: TestQueryWrapper },
    );

    // Wait for the fresh fetch to complete and update the cache
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isFetching).toBe(false);
        expect(result.current.data?.available).toBe(5);
      },
      { timeout: 3000 },
    );

    // The stale value (8) must not be the final answer
    expect(result.current.data?.available).not.toBe(8);
  });

  it("returns cached data immediately while background refetch is in flight", async () => {
    hcmStore.setBalance("emp2", "loc2", 10, "PTO");
    testQueryClient.setQueryData(QUERY_KEYS.balance("emp2", "loc2", "PTO"), {
      employeeId: "emp2",
      locationId: "loc2",
      policy: "PTO",
      available: 10,
      asOf: new Date().toISOString(),
      version: 1,
    });

    const { result } = renderHook(
      () => useDecisionContext("emp2", "loc2", "PTO"),
      { wrapper: TestQueryWrapper },
    );

    // Immediately has cached data (stale-while-revalidate: shows stale while fetching)
    expect(result.current.data?.available).toBe(10);

    // And eventually settles
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data?.available).toBe(10);
  });
});
