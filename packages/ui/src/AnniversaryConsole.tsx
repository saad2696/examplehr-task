import React, { useState } from "react";
import { useCorpus, useTriggerAnniversary } from "@repo/data-layer";

export interface AnniversaryConsoleProps {
  employeeNames?: Record<string, string>;
}

export function AnniversaryConsole({ employeeNames }: AnniversaryConsoleProps) {
  const { data: corpus, isLoading } = useCorpus();
  const trigger = useTriggerAnniversary();

  const [target, setTarget] = useState("");
  const [bonusInput, setBonusInput] = useState("5");

  const cells = (corpus ?? []).filter((c) => c.policy === "PTO");
  const nameFor = (id: string) => employeeNames?.[id] ?? id;

  function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    const cell = cells.find(
      (c) => `${c.employeeId}:${c.locationId}:${c.policy}` === target,
    );
    const bonus = Number(bonusInput);
    if (!cell || !Number.isFinite(bonus) || bonus <= 0) return;

    trigger.mutate({
      employeeId: cell.employeeId,
      locationId: cell.locationId,
      policy: cell.policy,
      bonus,
    });
  }

  const selected = cells.find(
    (c) => `${c.employeeId}:${c.locationId}:${c.policy}` === target,
  );
  const isPending = trigger.status === "pending";

  return (
    <div style={styles.container} data-testid="anniversary-console">
      <h2 style={styles.heading}>Anniversary / Bonus PTO</h2>
      <p style={styles.blurb}>
        Grant bonus days to a balance cell. The award lands in HCM and the employee
        view refetches the affected balance live — pending requests keep their hold.
      </p>

      <form onSubmit={handleGrant} style={styles.form} data-testid="grant-form">
        <div style={styles.field}>
          <label style={styles.label} htmlFor="target-select">
            Balance cell
          </label>
          <select
            id="target-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={isLoading || isPending}
            style={styles.input}
            data-testid="target-select"
          >
            <option value="">{isLoading ? "Loading cells…" : "Select a cell…"}</option>
            {cells.map((c) => {
              const key = `${c.employeeId}:${c.locationId}:${c.policy}`;
              return (
                <option key={key} value={key}>
                  {nameFor(c.employeeId)} · {c.locationId} · {c.policy}
                </option>
              );
            })}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="bonus-input">
            Bonus days
          </label>
          <input
            id="bonus-input"
            type="number"
            min={1}
            value={bonusInput}
            onChange={(e) => setBonusInput(e.target.value)}
            disabled={isPending}
            style={styles.input}
            data-testid="bonus-input"
          />
        </div>

        <button
          type="submit"
          disabled={!target || isPending}
          style={{
            ...styles.button,
            opacity: !target || isPending ? 0.5 : 1,
            cursor: !target || isPending ? "not-allowed" : "pointer",
          }}
          data-testid="grant-button"
        >
          {isPending ? "Granting…" : "Grant bonus"}
        </button>

        {trigger.isSuccess && selected && (
          <div style={styles.successMsg} data-testid="grant-success">
            Granted {bonusInput} {selected.policy} day(s) to {nameFor(selected.employeeId)}.
            Switch to the employee view to see the updated balance.
          </div>
        )}
        {trigger.isError && (
          <div style={styles.errorMsg} role="alert" data-testid="grant-error">
            Grant failed. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 480,
    fontFamily: "system-ui, sans-serif",
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  blurb: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  button: {
    padding: "10px 20px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  successMsg: {
    fontSize: 13,
    color: "#15803d",
    background: "#f0fdf4",
    borderRadius: 6,
    padding: "8px 12px",
  },
  errorMsg: {
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    borderRadius: 6,
    padding: "8px 12px",
  },
};
