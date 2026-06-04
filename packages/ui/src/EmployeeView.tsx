import React from "react";
import { useBalance, usePendingHold } from "@repo/data-layer";
import { BalanceList } from "./BalanceList";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";

export interface EmployeeViewProps {
  employeeId: string;
  locationId: string;
  policy?: string;
}

export function EmployeeView({ employeeId, locationId, policy = "PTO" }: EmployeeViewProps) {
  const { data: balance } = useBalance(employeeId, locationId, policy);
  const pendingHold = usePendingHold(employeeId, locationId, policy);
  const effectiveAvailable = (balance?.available ?? 0) - pendingHold;

  return (
    <div style={styles.container}>
      <section style={styles.section}>
        <h2 style={styles.heading}>Your Balances</h2>
        <BalanceList employeeId={employeeId} locationId={locationId} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Request Time Off</h2>
        <RequestForm
          employeeId={employeeId}
          locationId={locationId}
          policy={policy}
          effectiveAvailable={effectiveAvailable}
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Your Requests</h2>
        <RequestList employeeId={employeeId} />
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
    maxWidth: 600,
    padding: 24,
    fontFamily: "system-ui, sans-serif",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
};
