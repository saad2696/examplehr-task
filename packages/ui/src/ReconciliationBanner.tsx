import React from "react";
import type { RequestStatus } from "@repo/contracts";

export interface ReconciliationBannerProps {
  status: RequestStatus;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const messages: Partial<Record<RequestStatus, string>> = {
  NEEDS_ATTENTION:
    "The HCM response could not be verified. The balance may not have changed. Please re-read the balance and retry.",
  APPROVING: "Approval in progress — waiting for HCM confirmation…",
};

export function ReconciliationBanner({ status, onRetry, onDismiss }: ReconciliationBannerProps) {
  const message = messages[status];
  if (!message) return null;

  const isError = status === "NEEDS_ATTENTION";

  return (
    <div
      style={{ ...styles.banner, ...(isError ? styles.error : styles.info) }}
      role="alert"
      data-testid="reconciliation-banner"
    >
      <span style={styles.text}>{message}</span>
      <div style={styles.actions}>
        {isError && onRetry && (
          <button style={styles.retryBtn} onClick={onRetry} data-testid="retry-btn">
            Retry
          </button>
        )}
        {onDismiss && (
          <button style={styles.dismissBtn} onClick={onDismiss} data-testid="dismiss-btn">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    borderRadius: 6,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 13,
  },
  info: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e40af",
  },
  error: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
  },
  text: { flex: 1 },
  actions: { display: "flex", gap: 8, flexShrink: 0 },
  retryBtn: {
    padding: "4px 12px",
    background: "#ea580c",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  dismissBtn: {
    padding: "4px 12px",
    background: "transparent",
    border: "1px solid currentColor",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
};
