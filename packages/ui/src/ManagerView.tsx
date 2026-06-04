import React from "react";
import { PendingRequestList } from "./PendingRequestList";
import { AnniversaryConsole } from "./AnniversaryConsole";

export interface ManagerViewProps {
  employeeNames?: Record<string, string>;
}

export function ManagerView({ employeeNames }: ManagerViewProps) {
  return (
    <div style={styles.container}>
      <section>
        <AnniversaryConsole employeeNames={employeeNames} />
      </section>

      <hr style={styles.divider} />

      <section>
        <h2 style={styles.heading}>Pending Requests</h2>
        <PendingRequestList />
      </section>
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
    margin: "0 0 16px",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "8px 0",
    width: "100%",
  },
};
