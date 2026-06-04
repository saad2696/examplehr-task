import React from "react";
import type { Balance } from "@repo/contracts";

export interface BalanceCardProps {
  balance: Balance;
  pendingHold: number;
  isStale: boolean;
  isLoading?: boolean;
  error?: string;
}

export function BalanceCard({ balance, pendingHold, isStale, isLoading, error }: BalanceCardProps) {
  if (isLoading) {
    return (
      <div style={styles.card} data-testid="balance-card-loading">
        <div style={styles.skeleton} />
        <div style={{ ...styles.skeleton, width: "60%" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.card, borderColor: "#f87171" }} data-testid="balance-card-error">
        <span style={{ color: "#ef4444" }}>Error loading balance: {error}</span>
      </div>
    );
  }

  const effective = balance.available - pendingHold;

  return (
    <div style={styles.card} data-testid="balance-card">
      <div style={styles.header}>
        <span style={styles.policy}>{balance.policy}</span>
        {isStale && (
          <span style={styles.staleBadge} data-testid="stale-badge">
            stale
          </span>
        )}
      </div>

      <div style={styles.available} data-testid="available-days">
        {effective} <small style={styles.unit}>days available</small>
      </div>

      {pendingHold > 0 && (
        <div style={styles.hold} data-testid="pending-hold">
          {pendingHold} day{pendingHold !== 1 ? "s" : ""} pending
        </div>
      )}

      <div style={styles.meta}>
        as of {new Date(balance.asOf).toLocaleString()} · v{balance.version}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 16px",
    minWidth: 200,
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  policy: {
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
  },
  staleBadge: {
    fontSize: 11,
    fontWeight: 500,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 4,
    padding: "2px 6px",
  },
  available: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1d4ed8",
    lineHeight: 1,
  },
  unit: {
    fontSize: 13,
    fontWeight: 400,
    color: "#6b7280",
  },
  hold: {
    fontSize: 13,
    color: "#f59e0b",
    fontStyle: "italic",
  },
  meta: {
    fontSize: 11,
    color: "#9ca3af",
  },
  skeleton: {
    height: 16,
    background: "#e5e7eb",
    borderRadius: 4,
    width: "80%",
    animation: "pulse 1.5s ease-in-out infinite",
  },
};
