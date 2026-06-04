import { useQuery } from "@tanstack/react-query";
import { BalanceSchema } from "@repo/contracts";
import { QUERY_KEYS } from "../query-keys";
import { getOrigin } from "../origin";

/**
 * Like useBalance but always refetches on mount (staleTime: 0).
 * Used by the manager's RequestReviewCard so the balance shown at decision
 * time is always authoritative, never a 5-min-old corpus-seeded value.
 */
export function useDecisionContext(
  employeeId: string,
  locationId: string,
  policy: string,
) {
  return useQuery({
    queryKey: QUERY_KEYS.balance(employeeId, locationId, policy),
    queryFn: async () => {
      const params = new URLSearchParams({ employeeId, locationId, policy });
      const res = await fetch(`${getOrigin()}/api/hcm/balance?${params}`);
      if (!res.ok) throw new Error(`balance fetch failed: ${res.status}`);
      const json = await res.json();
      return BalanceSchema.parse(json);
    },
    staleTime: 0,         // always treat cached data as stale → always refetch on mount
    refetchOnMount: true,
  });
}
