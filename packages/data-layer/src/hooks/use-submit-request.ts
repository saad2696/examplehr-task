import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimeOffRequest } from "@repo/contracts";
import { requestStore } from "../request-store";
import { QUERY_KEYS } from "../query-keys";

export interface SubmitVariables {
  employeeId: string;
  locationId: string;
  policy: string;
  days: number;
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();

  return useMutation<TimeOffRequest, Error, SubmitVariables, { prevHold: number }>({
    mutationFn: async (vars): Promise<TimeOffRequest> => {
      const request: TimeOffRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        employeeId: vars.employeeId,
        locationId: vars.locationId,
        policy: vars.policy,
        days: vars.days,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
      };
      requestStore.add(request);
      return request;
    },

    onMutate: async (vars) => {
      const holdKey = QUERY_KEYS.pendingHold(vars.employeeId, vars.locationId, vars.policy);
      const prevHold = queryClient.getQueryData<number>(holdKey) ?? 0;
      queryClient.setQueryData<number>(holdKey, prevHold + vars.days);
      return { prevHold };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
    },

    onError: (_, vars, context) => {
      if (context) {
        queryClient.setQueryData<number>(
          QUERY_KEYS.pendingHold(vars.employeeId, vars.locationId, vars.policy),
          context.prevHold,
        );
      }
    },
  });
}
