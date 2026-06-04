import React from "react";
import { useRequests } from "@repo/data-layer";
import { RequestRow } from "./RequestRow";

export interface RequestListProps {
  employeeId: string;
}

export function RequestList({ employeeId }: RequestListProps) {
  const { data: requests, isLoading } = useRequests();

  const myRequests = (requests ?? [])
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  if (isLoading) {
    return (
      <div style={styles.container} data-testid="request-list-loading">
        Loading requests…
      </div>
    );
  }

  if (myRequests.length === 0) {
    return (
      <div style={styles.empty} data-testid="request-list-empty">
        No requests yet.
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="request-list">
      {myRequests.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  empty: {
    color: "#9ca3af",
    fontSize: 14,
    padding: "16px 0",
    textAlign: "center",
  },
};
