"use client";
import React, { useState } from "react";
import { EmployeeView, ManagerView } from "@repo/ui";
import { EMPLOYEE_NAMES, EMPLOYEES, employeeName } from "../lib/directory";

type Tab = "employee" | "manager";

export default function Home() {
  const [tab, setTab] = useState<Tab>("employee");
  const [selected, setSelected] = useState(EMPLOYEES[0]!);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 32 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, padding: "16px 0", margin: 0, color: "#111827" }}>
            ExampleHR — Time Off
          </h1>
          <nav style={{ display: "flex", gap: 4 }}>
            <TabButton active={tab === "employee"} onClick={() => setTab("employee")}>
              Employee View
            </TabButton>
            <TabButton active={tab === "manager"} onClick={() => setTab("manager")}>
              Manager View
            </TabButton>
          </nav>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {tab === "employee" ? (
          <EmployeeView
            key={`${selected.employeeId}:${selected.locationId}`}
            employeeId={selected.employeeId}
            locationId={selected.locationId}
            employeeName={employeeName(selected.employeeId)}
            employees={EMPLOYEES}
            onSelectEmployee={(employeeId, locationId) => {
              const next = EMPLOYEES.find(
                (e) => e.employeeId === employeeId && e.locationId === locationId,
              );
              if (next) setSelected(next);
            }}
          />
        ) : (
          <ManagerView employeeNames={EMPLOYEE_NAMES} />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        cursor: "pointer",
        border: "none",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        background: "none",
        fontSize: 15,
        fontWeight: active ? 700 : 400,
        color: active ? "#2563eb" : "#6b7280",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}
