import React, { useState } from "react";
import { z } from "zod";
import { useSubmitRequest } from "@repo/data-layer";

export interface RequestFormProps {
  employeeId: string;
  locationId: string;
  policy: string;
  effectiveAvailable: number;
}

function policyLabel(policy: string): string {
  if (policy === "PTO") return "Vacation (PTO)";
  if (policy === "SICK") return "Sick leave";
  return policy;
}

const FormSchema = z.object({
  days: z
    .number({ invalid_type_error: "Enter a number of days" })
    .positive("Must be at least 1 day")
    .int("Must be whole days"),
});

export function RequestForm({ employeeId, locationId, policy, effectiveAvailable }: RequestFormProps) {
  const [daysInput, setDaysInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = useSubmitRequest();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const parsed = FormSchema.safeParse({ days: Number(daysInput) });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0].message);
      return;
    }
    if (parsed.data.days > effectiveAvailable) {
      setFieldError(`Cannot exceed ${effectiveAvailable} available days`);
      return;
    }

    submit.mutate(
      { employeeId, locationId, policy, days: parsed.data.days },
      {
        onSuccess: () => {
          setDaysInput("");
          setFieldError(null);
        },
      },
    );
  }

  const isPending = submit.status === "pending";

  return (
    <form onSubmit={handleSubmit} style={styles.form} data-testid="request-form">
      <div style={styles.field}>
        <label style={styles.label} htmlFor="days-input">
          {policyLabel(policy)} days to request
        </label>
        <input
          id="days-input"
          type="number"
          min={1}
          max={effectiveAvailable}
          value={daysInput}
          onChange={(e) => setDaysInput(e.target.value)}
          disabled={isPending}
          style={styles.input}
          data-testid="days-input"
          placeholder="0"
        />
        {fieldError && (
          <span style={styles.fieldError} role="alert" data-testid="form-error">
            {fieldError}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !daysInput}
        style={{
          ...styles.button,
          opacity: isPending || !daysInput ? 0.5 : 1,
          cursor: isPending || !daysInput ? "not-allowed" : "pointer",
        }}
        data-testid="submit-button"
      >
        {isPending ? "Submitting…" : "Request time off"}
      </button>

      {submit.isSuccess && (
        <div style={styles.successMsg} data-testid="submit-success">
          Request submitted — status: {submit.data?.status}
        </div>
      )}

      {submit.isError && (
        <div style={styles.errorMsg} role="alert" data-testid="submit-error">
          Submission failed. Please try again.
        </div>
      )}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 320,
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
  },
  fieldError: {
    fontSize: 12,
    color: "#ef4444",
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
