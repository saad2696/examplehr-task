import React from "react";
import { PendingRequestList } from "./PendingRequestList";

export function ManagerView() {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Pending Requests</h2>
      <PendingRequestList />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: 600,
    padding: 24,
    fontFamily: "system-ui, sans-serif",
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
};
