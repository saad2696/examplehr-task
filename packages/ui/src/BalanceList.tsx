import React from "react";
import { useCorpus, useBalance, usePendingHold, isBalanceStale } from "@repo/data-layer";
import { BalanceCard } from "./BalanceCard";

export interface BalanceListProps {
  employeeId: string;
  locationId?: string;
}

export function BalanceList({ employeeId, locationId }: BalanceListProps) {
  const { data: corpus, isLoading, error } = useCorpus();

  if (isLoading) {
    return (
      <div style={styles.grid} data-testid="balance-list-loading">
        {[0, 1, 2].map((i) => (
          <BalanceCard
            key={i}
            balance={{ employeeId: "", locationId: "", policy: "", available: 0, asOf: "", version: 0 }}
            pendingHold={0}
            isStale={false}
            isLoading
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error} data-testid="balance-list-error">
        Failed to load balances.
      </div>
    );
  }

  const rows = (corpus ?? []).filter(
    (b) =>
      b.employeeId === employeeId &&
      (locationId == null || b.locationId === locationId),
  );

  if (rows.length === 0) {
    return (
      <div style={styles.empty} data-testid="balance-list-empty">
        No balance rows found.
      </div>
    );
  }

  return (
    <div style={styles.grid} data-testid="balance-list">
      {rows.map((b) => (
        <ConnectedBalanceCard
          key={`${b.employeeId}:${b.locationId}:${b.policy}`}
          employeeId={b.employeeId}
          locationId={b.locationId}
          policy={b.policy}
        />
      ))}
    </div>
  );
}

function ConnectedBalanceCard({
  employeeId,
  locationId,
  policy,
}: {
  employeeId: string;
  locationId: string;
  policy: string;
}) {
  const { data, isLoading, error } = useBalance(employeeId, locationId, policy);
  const pendingHold = usePendingHold(employeeId, locationId, policy);

  if (isLoading || !data) {
    return (
      <BalanceCard
        balance={{ employeeId, locationId, policy, available: 0, asOf: "", version: 0 }}
        pendingHold={0}
        isStale={false}
        isLoading
      />
    );
  }

  if (error) {
    return (
      <BalanceCard
        balance={{ employeeId, locationId, policy, available: 0, asOf: "", version: 0 }}
        pendingHold={0}
        isStale={false}
        error={String(error)}
      />
    );
  }

  return (
    <BalanceCard
      balance={data}
      pendingHold={pendingHold}
      isStale={isBalanceStale(data.asOf)}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  empty: {
    color: "#9ca3af",
    padding: "24px 0",
    textAlign: "center",
  },
  error: {
    color: "#ef4444",
    padding: "24px 0",
    textAlign: "center",
  },
};
