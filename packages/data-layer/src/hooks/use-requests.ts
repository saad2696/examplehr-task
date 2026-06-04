import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestStore } from "../request-store";
import { QUERY_KEYS } from "../query-keys";

export function useRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.requests(),
    queryFn: () => requestStore.getAll(),
    // staleTime: 0 (default) — always refetch on mount so newly submitted requests
    // appear in the manager view even when submitted from a different tab/view.
  });
}

export function useRefreshRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
}
