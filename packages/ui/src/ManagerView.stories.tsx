import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { requestStore, QUERY_KEYS } from "@repo/data-layer";
import type { TimeOffRequest } from "@repo/contracts";
import { ManagerView } from "./ManagerView";

const now = new Date().toISOString();

function makeRequest(id: string, status: TimeOffRequest["status"], days = 3): TimeOffRequest {
  return {
    id,
    employeeId: `emp-${id}`,
    locationId: "loc-nyc",
    policy: "PTO",
    days,
    status,
    submittedAt: now,
  };
}

function withManagerSetup(requests: TimeOffRequest[]) {
  return (Story: React.ComponentType) => {
    requestStore.reset();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    for (const r of requests) {
      requestStore.add(r);
      qc.setQueryData(QUERY_KEYS.balance(r.employeeId, r.locationId, r.policy), {
        employeeId: r.employeeId,
        locationId: r.locationId,
        policy: r.policy,
        available: 10,
        asOf: now,
        version: 1,
      });
    }
    void qc.prefetchQuery({ queryKey: QUERY_KEYS.requests(), queryFn: () => requestStore.getAll() });
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof ManagerView> = {
  component: ManagerView,
  title: "Manager/ManagerView",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ManagerView>;

export const Empty: Story = {
  name: "empty — no pending requests",
  decorators: [withManagerSetup([])],
};

export const WithPending: Story = {
  name: "manager-decision-context — pending queue",
  decorators: [
    withManagerSetup([makeRequest("alice", "PENDING", 2), makeRequest("bob", "PENDING", 5)]),
  ],
};

export const WithNeedsAttention: Story = {
  name: "NEEDS_ATTENTION — reconciliation banner shown",
  decorators: [withManagerSetup([makeRequest("carol", "NEEDS_ATTENTION", 3)])],
};
