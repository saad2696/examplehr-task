import React from "react";
import type { TimeOffRequest } from "@repo/contracts";

export interface RequestRowProps {
  request: TimeOffRequest;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "#eff6ff", text: "#1d4ed8" },
  APPROVING: { bg: "#f0fdf4", text: "#15803d" },
  APPROVED: { bg: "#dcfce7", text: "#166534" },
  DENIED: { bg: "#fef2f2", text: "#991b1b" },
  NEEDS_ATTENTION: { bg: "#fff7ed", text: "#9a3412" },
  ROLLED_BACK: { bg: "#f9fafb", text: "#6b7280" },
};

export function RequestRow({ request }: RequestRowProps) {
  const color = statusColors[request.status] ?? statusColors.PENDING;

  return (
    <div style={styles.row} data-testid="request-row">
      <div style={styles.info}>
        <span style={styles.policy}>{request.policy}</span>
        <span style={styles.days}>{request.days} day{request.days !== 1 ? "s" : ""}</span>
        <span style={styles.date}>{new Date(request.submittedAt).toLocaleDateString()}</span>
      </div>
      <span
        style={{ ...styles.badge, background: color.bg, color: color.text }}
        data-testid={`request-status-${request.status.toLowerCase()}`}
      >
        {request.status.replace("_", " ")}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
  },
  info: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  policy: {
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
    minWidth: 48,
  },
  days: {
    fontSize: 14,
    color: "#374151",
  },
  date: {
    fontSize: 12,
    color: "#9ca3af",
  },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 4,
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
};
