"use client";
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { requestStore } from "@repo/data-layer";
import type { TimeOffRequest } from "@repo/contracts";

function seedDemoRequests(): void {
  if (requestStore.getAll().length > 0) return;
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const requests: TimeOffRequest[] = [
    // Maya — 3-day PTO request (should approve fine: 10 available)
    {
      id: "req-demo-1",
      employeeId: "emp-maya",
      locationId: "loc-nyc",
      policy: "PTO",
      days: 3,
      status: "PENDING",
      submittedAt: now,
    },
    {
      id: "req-demo-maya-sick",
      employeeId: "emp-maya",
      locationId: "loc-nyc",
      policy: "SICK",
      days: 2,
      status: "PENDING",
      submittedAt: now,
    },
    {
      id: "req-demo-2",
      employeeId: "emp-alex",
      locationId: "loc-nyc",
      policy: "SICK",
      days: 2,
      status: "PENDING",
      submittedAt: yesterday,
    },
    // Jordan — 5-day PTO (7 available, should approve)
    {
      id: "req-demo-3",
      employeeId: "emp-jordan",
      locationId: "loc-nyc",
      policy: "PTO",
      days: 5,
      status: "PENDING",
      submittedAt: yesterday,
    },
    // Maya — already approved (terminal state demo)
    {
      id: "req-demo-4",
      employeeId: "emp-maya",
      locationId: "loc-nyc",
      policy: "SICK",
      days: 1,
      status: "APPROVED",
      submittedAt: yesterday,
      decidedAt: yesterday,
    },
  ];
  requests.forEach((r) => requestStore.add(r));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => {
    seedDemoRequests();
    return new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
