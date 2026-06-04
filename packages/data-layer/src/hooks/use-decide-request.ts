import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BalanceSchema, HcmWriteResultSchema, type Balance, type RequestStatus } from "@repo/contracts";
import { requestStore } from "../request-store";
import { QUERY_KEYS } from "../query-keys";
import { getOrigin } from "../origin";

export interface DecideVariables {
  requestId: string;
  decision: "approve" | "deny";
  employeeId: string;
  locationId: string;
  policy: string;
  days: number;
  version: number;
}

interface DecideResult {
  outcome: Extract<RequestStatus, "APPROVED" | "DENIED" | "NEEDS_ATTENTION">;
  balance?: Balance;
}

export function useDecideRequest() {
  const queryClient = useQueryClient();

  return useMutation<DecideResult, Error, DecideVariables, { snapshotBalance: Balance | undefined }>({
    mutationFn: async (vars): Promise<DecideResult> => {
      if (vars.decision === "deny") return { outcome: "DENIED" };

      const origin = getOrigin();
      const balanceKey = QUERY_KEYS.balance(vars.employeeId, vars.locationId, vars.policy);

      // Snapshot the current cached balance for version comparison after verify
      const snapshot = queryClient.getQueryData<Balance>(balanceKey);

      // Write to HCM
      const writeRes = await fetch(`${origin}/api/hcm/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: vars.employeeId,
          locationId: vars.locationId,
          policy: vars.policy,
          delta: -vars.days,
          version: vars.version,
        }),
      });
      if (!writeRes.ok) throw new Error(`write failed: ${writeRes.status}`);
      const writeResult = HcmWriteResultSchema.parse(await writeRes.json());

      if (!writeResult.ok) {
        // Clear rejection: insufficient balance or invalid dimension → DENIED
        // Version conflict → NEEDS_ATTENTION (recoverable, can retry with fresh version)
        if (
          writeResult.conflict === "INSUFFICIENT_BALANCE" ||
          writeResult.conflict === "INVALID_DIMENSION"
        ) {
          return { outcome: "DENIED" };
        }
        return { outcome: "NEEDS_ATTENTION" };
      }

      // Post-write verify — never trust the 200 OK alone
      const params = new URLSearchParams({
        employeeId: vars.employeeId,
        locationId: vars.locationId,
        policy: vars.policy,
      });
      const verifyRes = await fetch(`${origin}/api/hcm/balance?${params}`);
      if (!verifyRes.ok) throw new Error(`verify failed: ${verifyRes.status}`);
      const fresh = BalanceSchema.parse(await verifyRes.json());

      queryClient.setQueryData(balanceKey, fresh);

      // Version is the canonical silent-wrong detector: a real write increments version.
      // An external increase (anniversary) also increments version, so version > snapshot.version
      // is true for both confirmed writes AND external mutations — both are "something changed."
      // silent-wrong returns version === snapshot.version (nothing changed in the store).
      const decrementLanded = snapshot == null || fresh.version > snapshot.version;

      return decrementLanded
        ? { outcome: "APPROVED", balance: fresh }
        : { outcome: "NEEDS_ATTENTION", balance: fresh };
    },

    onMutate: async (vars) => {
      const balanceKey = QUERY_KEYS.balance(vars.employeeId, vars.locationId, vars.policy);
      await queryClient.cancelQueries({ queryKey: balanceKey });

      const snapshotBalance = queryClient.getQueryData<Balance>(balanceKey);

      // Optimistically show APPROVING while the write + verify is in flight
      requestStore.update(vars.requestId, { status: "APPROVING" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });

      return { snapshotBalance };
    },

    onSuccess: (result, vars) => {
      requestStore.update(vars.requestId, {
        status: result.outcome,
        decidedAt: new Date().toISOString(),
      });

      // Clear pendingHold only on terminal outcomes — NEEDS_ATTENTION keeps the hold
      // because the request is unresolved and the days are still "claimed"
      if (result.outcome === "APPROVED" || result.outcome === "DENIED") {
        const holdKey = QUERY_KEYS.pendingHold(vars.employeeId, vars.locationId, vars.policy);
        const hold = queryClient.getQueryData<number>(holdKey) ?? 0;
        queryClient.setQueryData<number>(holdKey, Math.max(0, hold - vars.days));
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.balance(vars.employeeId, vars.locationId, vars.policy),
      });
    },

    onError: (_, vars, context) => {
      // Network/unexpected error → NEEDS_ATTENTION (recoverable)
      requestStore.update(vars.requestId, { status: "NEEDS_ATTENTION" });

      if (context?.snapshotBalance) {
        queryClient.setQueryData(
          QUERY_KEYS.balance(vars.employeeId, vars.locationId, vars.policy),
          context.snapshotBalance,
        );
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
    },
  });
}
