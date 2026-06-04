import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { BalanceSchema, type Balance } from "@repo/contracts";
import { QUERY_KEYS } from "../query-keys";
import { getOrigin } from "../origin";

const CorpusResponseSchema = z.array(BalanceSchema);

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
      const key = QUERY_KEYS.balance(balance.employeeId, balance.locationId, balance.policy);
      const existing = queryClient.getQueryData<Balance>(key);
      if (existing && existing.version > balance.version) continue;
      queryClient.setQueryData(key, balance);
    }
  }, [query.data, queryClient]);

  return query;
}
