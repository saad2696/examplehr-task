import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { hcmStore } from "@repo/hcm-mock";
import { useBalance } from "./use-balance";
import { useCorpus } from "./use-corpus";
import { TestQueryWrapper } from "../test-utils";
import { testQueryClient } from "../test-utils";
import { QUERY_KEYS } from "../query-keys";

describe("useBalance", () => {
  it("fetches a single balance cell", async () => {
    hcmStore.setBalance("emp1", "loc1", 15, "PTO");

    const { result } = renderHook(() => useBalance("emp1", "loc1", "PTO"), {
      wrapper: TestQueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.available).toBe(15);
  });

  it("parses response with Zod — rejects malformed response", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@repo/testing/msw-server");

    server.use(
      http.get("http://*/api/hcm/balance", () =>
        HttpResponse.json({ bad: "shape" }),
      ),
    );

    const { result } = renderHook(() => useBalance("empX", "locX", "PTO"), {
      wrapper: TestQueryWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // IT-10: surgically-invalidated cells refetch; untouched cells use corpus cache
  it("IT-10: invalidated cell refetches; untouched cell uses corpus-seeded cache", async () => {
    // Seed two cells
    hcmStore.setBalance("itEmp", "itLoc", 100, "PTO");
    hcmStore.setBalance("itEmp", "itLoc", 50, "SICK");

    // Hydrate corpus — seeds both cells into the query cache
    const { result: corpusResult } = renderHook(() => useCorpus(), {
      wrapper: TestQueryWrapper,
    });
    await waitFor(() => expect(corpusResult.current.isSuccess).toBe(true));

    // Verify both are in cache
    const ptoCached = testQueryClient.getQueryData(
      QUERY_KEYS.balance("itEmp", "itLoc", "PTO"),
    ) as { available: number } | undefined;
    expect(ptoCached?.available).toBe(100);

    // Mutate both cells in the store — these are "external changes"
    hcmStore.setBalance("itEmp", "itLoc", 999, "PTO");
    hcmStore.setBalance("itEmp", "itLoc", 888, "SICK");

    // Surgically invalidate only PTO
    await act(async () => {
      await testQueryClient.invalidateQueries({
        queryKey: QUERY_KEYS.balance("itEmp", "itLoc", "PTO"),
      });
    });

    // PTO: useBalance should trigger a fresh fetch and see new value
    const { result: ptoResult } = renderHook(
      () => useBalance("itEmp", "itLoc", "PTO"),
      { wrapper: TestQueryWrapper },
    );
    // Wait for the background refetch to complete and deliver the fresh value
    await waitFor(() => {
      expect(ptoResult.current.isSuccess).toBe(true);
      expect(ptoResult.current.isFetching).toBe(false);
      expect(ptoResult.current.data?.available).toBe(999);
    });

    // SICK: still within staleTime — should return old corpus-seeded value (50)
    const { result: sickResult } = renderHook(
      () => useBalance("itEmp", "itLoc", "SICK"),
      { wrapper: TestQueryWrapper },
    );
    await waitFor(() => expect(sickResult.current.isSuccess).toBe(true));
    expect(sickResult.current.data?.available).toBe(50);
  });
});
