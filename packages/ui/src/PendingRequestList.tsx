import React from "react";
import { useRequests } from "@repo/data-layer";
import { RequestReviewCard } from "./RequestReviewCard";

export function PendingRequestList() {
  const { data: requests, isLoading } = useRequests();

  const actionable = (requests ?? [])
    .filter(
      (r) => r.status === "PENDING" || r.status === "APPROVING" || r.status === "NEEDS_ATTENTION",
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  if (isLoading) {
    return (
      <div style={styles.loading} data-testid="pending-list-loading">
        Loading requests…
      </div>
    );
  }

  if (actionable.length === 0) {
    return (
      <div style={styles.empty} data-testid="pending-list-empty">
        No pending requests.
      </div>
    );
  }

  return (
    <div style={styles.list} data-testid="pending-request-list">
      {actionable.map((r) => (
        <RequestReviewCard key={r.id} request={r} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: 12 },
  loading: { color: "#9ca3af", padding: "16px 0" },
  empty: { color: "#9ca3af", fontSize: 14, padding: "16px 0", textAlign: "center" },
};
