import React, { useState } from "react";
import { useBalance, usePendingHold } from "@repo/data-layer";
import { BalanceList } from "./BalanceList";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";

export interface EmployeeViewProps {
  employeeId: string;
  locationId: string;
  employeeName?: string;
  policies?: string[];
  policy?: string;
  employees?: Array<{ employeeId: string; locationId: string; name: string }>;
  onSelectEmployee?: (employeeId: string, locationId: string) => void;
}

export function EmployeeView({
  employeeId,
  locationId,
  employeeName,
  policies,
  policy,
  employees,
  onSelectEmployee,
}: EmployeeViewProps) {
  const policyOptions = policies ?? (policy ? [policy, "SICK"] : ["PTO", "SICK"]);
  const options = Array.from(new Set(policyOptions));
  const [selectedPolicy, setSelectedPolicy] = useState(options[0]!);

  const { data: balance, isLoading: balanceLoading } = useBalance(
    employeeId,
    locationId,
    selectedPolicy,
  );
  const pendingHold = usePendingHold(employeeId, locationId, selectedPolicy);
  // Don't compute until balance has loaded — prevents 0 - pendingHold = negative display
  const effectiveAvailable = balance ? Math.max(0, balance.available - pendingHold) : 0;

  return (
    <div style={styles.container}>
      <header style={styles.identity}>
        <div style={styles.avatar} aria-hidden>
          {initials(employeeName ?? employeeId)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.name} data-testid="employee-name">
            {employeeName ?? employeeId}
          </div>
          <div style={styles.subtitle}>
            {employeeId} · {locationId}
          </div>
        </div>
        {employees && employees.length > 1 && (
          <select
            aria-label="Switch employee"
            value={`${employeeId}:${locationId}`}
            onChange={(e) => {
              const [id, loc] = e.target.value.split(":");
              onSelectEmployee?.(id!, loc!);
            }}
            style={styles.picker}
            data-testid="employee-picker"
          >
            {employees.map((emp) => (
              <option
                key={`${emp.employeeId}:${emp.locationId}`}
                value={`${emp.employeeId}:${emp.locationId}`}
              >
                {emp.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <section style={styles.section}>
        <h2 style={styles.heading}>Your Balances</h2>
        <BalanceList employeeId={employeeId} locationId={locationId} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Request Time Off</h2>
        <div style={styles.policyTabs} role="tablist" aria-label="Leave type">
          {options.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={p === selectedPolicy}
              onClick={() => setSelectedPolicy(p)}
              style={{
                ...styles.policyTab,
                ...(p === selectedPolicy ? styles.policyTabActive : {}),
              }}
              data-testid={`policy-tab-${p}`}
            >
              {policyLabel(p)}
            </button>
          ))}
        </div>
        {balanceLoading ? (
          <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Loading balance…</p>
        ) : (
          <RequestForm
            key={selectedPolicy}
            employeeId={employeeId}
            locationId={locationId}
            policy={selectedPolicy}
            effectiveAvailable={effectiveAvailable}
          />
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Your Requests</h2>
        <RequestList employeeId={employeeId} />
      </section>
    </div>
  );
}

function policyLabel(policy: string): string {
  if (policy === "PTO") return "Vacation (PTO)";
  if (policy === "SICK") return "Sick Leave";
  return policy;
}

function initials(label: string): string {
  const parts = label.replace(/^emp-/, "").split(/[\s-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
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
  identity: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#1d4ed8",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  picker: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
    cursor: "pointer",
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
  policyTabs: {
    display: "flex",
    gap: 8,
  },
  policyTab: {
    padding: "6px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 9999,
    background: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  policyTabActive: {
    background: "#eff6ff",
    border: "1px solid #2563eb",
    color: "#1d4ed8",
    fontWeight: 700,
  },
};
