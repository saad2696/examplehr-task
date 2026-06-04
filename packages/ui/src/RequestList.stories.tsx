import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequestList } from "./RequestList";
import { QUERY_KEYS } from "@repo/data-layer";
import { requestStore } from "@repo/data-layer";
import type { TimeOffRequest } from "@repo/contracts";

const now = new Date().toISOString();

function makeRequest(id: string, status: TimeOffRequest["status"], days = 3): TimeOffRequest {
  return {
    id,
    employeeId: "emp-1",
    locationId: "loc-nyc",
    policy: "PTO",
    days,
    status,
    submittedAt: now,
  };
}

function withRequests(requests: TimeOffRequest[]) {
  return (Story: React.ComponentType) => {
    requestStore.reset();
    for (const r of requests) requestStore.add(r);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Invalidate so the hook re-reads from the store
    void qc.prefetchQuery({ queryKey: QUERY_KEYS.requests(), queryFn: () => requestStore.getAll() });
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof RequestList> = {
  component: RequestList,
  title: "Employee/RequestList",
  parameters: { layout: "padded" },
  args: { employeeId: "emp-1" },
};

export default meta;
type Story = StoryObj<typeof RequestList>;

export const Empty: Story = {
  name: "empty — no requests yet",
  decorators: [withRequests([])],
};

export const Pending: Story = {
  name: "optimistic-pending — PENDING row",
  decorators: [withRequests([makeRequest("r1", "PENDING")])],
};

export const Mixed: Story = {
  name: "mixed statuses",
  decorators: [
    withRequests([
      makeRequest("r1", "APPROVED", 2),
      makeRequest("r2", "PENDING", 3),
      makeRequest("r3", "DENIED", 1),
      makeRequest("r4", "NEEDS_ATTENTION", 5),
    ]),
  ],
};

export const NeedsAttention: Story = {
  name: "HCM-silently-wrong → NEEDS_ATTENTION",
  decorators: [withRequests([makeRequest("r1", "NEEDS_ATTENTION")])],
};

export const HcmRejected: Story = {
  name: "HCM-rejected → DENIED",
  decorators: [withRequests([makeRequest("r1", "DENIED")])],
};
