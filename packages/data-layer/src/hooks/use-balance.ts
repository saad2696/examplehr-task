import { useQuery } from "@tanstack/react-query";
import { BalanceSchema } from "@repo/contracts";
import { QUERY_KEYS } from "../query-keys";
import { STALE_THRESHOLD_MS } from "../stale";
import { getOrigin } from "../origin";

export function useBalance(employeeId: string, locationId: string, policy: string) {
  return useQuery({
    queryKey: QUERY_KEYS.balance(employeeId, locationId, policy),
    queryFn: async () => {
      const params = new URLSearchParams({ employeeId, locationId, policy });
      const res = await fetch(`${getOrigin()}/api/hcm/balance?${params}`);
      if (!res.ok) throw new Error(`balance fetch failed: ${res.status}`);
      const json = await res.json();
      return BalanceSchema.parse(json);
    },
    staleTime: STALE_THRESHOLD_MS,
  });
}
