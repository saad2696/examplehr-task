import React from "react";
import type { TimeOffRequest } from "@repo/contracts";
import { useDecisionContext, useDecideRequest } from "@repo/data-layer";
import { ReconciliationBanner } from "./ReconciliationBanner";

export interface RequestReviewCardProps {
  request: TimeOffRequest;
}

export function RequestReviewCard({ request }: RequestReviewCardProps) {
  const { employeeId, locationId, policy, days } = request;

  // staleTime:0 — always fires a fresh GET when this card mounts (IT-5)
  const { data: balance, isLoading: balanceLoading, isFetching } = useDecisionContext(
    employeeId,
    locationId,
    policy,
  );

  const decide = useDecideRequest();
  const status = request.status;
  const isBusy = decide.status === "pending" || status === "APPROVING";

  function handleApprove() {
    if (!balance) return;
    decide.mutate({
      requestId: request.id,
      decision: "approve",
      employeeId,
      locationId,
      policy,
      days,
      version: balance.version,
    });
  }

  function handleDeny() {
    if (!balance) return;
    decide.mutate({
      requestId: request.id,
      decision: "deny",
      employeeId,
      locationId,
      policy,
      days,
      version: balance.version,
    });
  }

  const canApprove = balance != null && balance.available >= days && !isBusy;
  const isTerminal = status === "APPROVED" || status === "DENIED";

  return (
    <div style={styles.card} data-testid="review-card">
      <div style={styles.header}>
        <div>
          <span style={styles.employee}>{employeeId}</span>
          <span style={styles.meta}>
            {" "}· {locationId} · {policy}
          </span>
        </div>
        <span style={styles.days} data-testid="requested-days">
          {days} day{days !== 1 ? "s" : ""} requested
        </span>
      </div>

      {/* Fresh balance context for the manager */}
      <div style={styles.balanceRow}>
        {balanceLoading ? (
          <span style={styles.balanceLoading}>Loading balance…</span>
        ) : (
          <span data-testid="decision-balance">
            {isFetching && <span style={styles.refreshing}> refreshing</span>}
            <strong data-testid="balance-available">
              {balance?.available ?? "—"} days available
            </strong>
            {balance && (
              <span style={styles.balanceMeta}>
                {" "}(as of {new Date(balance.asOf).toLocaleString()})
              </span>
            )}
            {balance && balance.available < days && (
              <span style={styles.insufficientBadge} data-testid="insufficient-badge">
                insufficient
              </span>
            )}
          </span>
        )}
      </div>

      {/* Reconciliation banner for NEEDS_ATTENTION / APPROVING */}
      {(status === "NEEDS_ATTENTION" || status === "APPROVING") && (
        <ReconciliationBanner status={status} />
      )}

      {/* Action buttons — hidden once terminal */}
      {!isTerminal && (
        <div style={styles.actions}>
          <button
            style={{
              ...styles.approveBtn,
              opacity: canApprove ? 1 : 0.4,
              cursor: canApprove ? "pointer" : "not-allowed",
            }}
            disabled={!canApprove}
            onClick={handleApprove}
            data-testid="approve-btn"
          >
            {isBusy && status === "APPROVING" ? "Approving…" : "Approve"}
          </button>
          <button
            style={{ ...styles.denyBtn, opacity: isBusy ? 0.4 : 1 }}
            disabled={isBusy}
            onClick={handleDeny}
            data-testid="deny-btn"
          >
            Deny
          </button>
        </div>
      )}

      {/* Terminal state confirmation */}
      {status === "APPROVED" && (
        <div style={styles.approvedMsg} data-testid="approved-msg">
          ✓ Approved
        </div>
      )}
      {status === "DENIED" && (
        <div style={styles.deniedMsg} data-testid="denied-msg">
          ✗ Denied
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "14px 16px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  employee: { fontWeight: 600, fontSize: 14, color: "#111827" },
  meta: { fontSize: 13, color: "#6b7280" },
  days: { fontSize: 14, fontWeight: 500, color: "#374151" },
  balanceRow: { fontSize: 14, color: "#374151" },
  balanceLoading: { color: "#9ca3af", fontStyle: "italic" },
  refreshing: { fontSize: 11, color: "#9ca3af", marginRight: 6 },
  balanceMeta: { fontSize: 12, color: "#9ca3af" },
  insufficientBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 600,
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 4,
    padding: "2px 6px",
  },
  actions: { display: "flex", gap: 8 },
  approveBtn: {
    padding: "8px 18px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  denyBtn: {
    padding: "8px 18px",
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
  },
  approvedMsg: {
    fontSize: 14,
    fontWeight: 600,
    color: "#15803d",
    padding: "6px 0",
  },
  deniedMsg: {
    fontSize: 14,
    fontWeight: 600,
    color: "#991b1b",
    padding: "6px 0",
  },
};
