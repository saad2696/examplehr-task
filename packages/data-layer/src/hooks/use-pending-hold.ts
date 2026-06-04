import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../query-keys";

export function usePendingHold(
  employeeId: string,
  locationId: string,
  policy: string,
): number {
  const { data } = useQuery<number>({
    queryKey: QUERY_KEYS.pendingHold(employeeId, locationId, policy),
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });
  return data;
}
