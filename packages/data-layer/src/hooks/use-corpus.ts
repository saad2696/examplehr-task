import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { BalanceSchema } from "@repo/contracts";
import { QUERY_KEYS } from "../query-keys";

const CorpusResponseSchema = z.array(BalanceSchema);

function getOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

export function useCorpus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.corpus(),
    queryFn: async () => {
      const res = await fetch(`${getOrigin()}/api/hcm/corpus`);
      if (!res.ok) throw new Error(`corpus fetch failed: ${res.status}`);
      const json = await res.json();
      return CorpusResponseSchema.parse(json);
    },
  });

  useEffect(() => {
    if (!query.data) return;
    for (const balance of query.data) {
      queryClient.setQueryData(
        QUERY_KEYS.balance(balance.employeeId, balance.locationId, balance.policy),
        balance,
      );
    }
  }, [query.data, queryClient]);

  return query;
}
