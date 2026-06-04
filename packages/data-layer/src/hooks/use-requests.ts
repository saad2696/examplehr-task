import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestStore } from "../request-store";
import { QUERY_KEYS } from "../query-keys";

export function useRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.requests(),
    queryFn: () => requestStore.getAll(),
    staleTime: Infinity,
  });
}

export function useRefreshRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
}
