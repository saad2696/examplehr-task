import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../query-keys";
import { getOrigin } from "../origin";

export interface TriggerAnniversaryVariables {
  employeeId: string;
  locationId: string;
  policy: string;
  bonus: number;
}

export function useTriggerAnniversary() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, TriggerAnniversaryVariables>({
    mutationFn: async (vars): Promise<void> => {
      const res = await fetch(`${getOrigin()}/api/hcm/trigger/anniversary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error(`anniversary trigger failed: ${res.status}`);
    },

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.balance(vars.employeeId, vars.locationId, vars.policy),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.corpus() });
    },
  });
}
