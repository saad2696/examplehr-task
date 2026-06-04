import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { hcmStore } from "@repo/hcm-mock";
import { useCorpus } from "./use-corpus";
import { TestQueryWrapper } from "../test-utils";
import { QUERY_KEYS } from "../query-keys";
import { testQueryClient } from "../test-utils";

describe("useCorpus", () => {
  it("fetches and returns the corpus", async () => {
    hcmStore.setBalance("e1", "l1", 10, "PTO");
    hcmStore.setBalance("e1", "l1", 5, "SICK");

    const { result } = renderHook(() => useCorpus(), { wrapper: TestQueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    const pto = result.current.data!.find((b) => b.policy === "PTO");
    expect(pto?.available).toBe(10);
  });

  it("seeds individual balance cache entries after fetch", async () => {
    hcmStore.setBalance("e2", "l2", 20, "PTO");

    const { result } = renderHook(() => useCorpus(), { wrapper: TestQueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = testQueryClient.getQueryData(QUERY_KEYS.balance("e2", "l2", "PTO"));
    expect(cached).toBeDefined();
    expect((cached as { available: number }).available).toBe(20);
  });

  it("parses the response with Zod — rejects a malformed response", async () => {
    // seed a valid balance but monkey-patch fetch to return a bad shape
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@repo/testing/msw-server");

    server.use(
      http.get("http://*/api/hcm/corpus", () =>
        HttpResponse.json([{ broken: true }]),
      ),
    );

    const { result } = renderHook(() => useCorpus(), { wrapper: TestQueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
