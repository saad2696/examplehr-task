import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { requestStore, QUERY_KEYS } from "@repo/data-layer";
import type { TimeOffRequest } from "@repo/contracts";
import { RequestReviewCard } from "./RequestReviewCard";

const now = new Date().toISOString();

const pendingRequest: TimeOffRequest = {
  id: "req-1",
  employeeId: "emp-maya",
  locationId: "loc-nyc",
  policy: "PTO",
  days: 3,
  status: "PENDING",
  submittedAt: now,
};

function withManagerContext(
  request: TimeOffRequest,
  balanceAvailable: number,
  version = 1,
) {
  return (Story: React.ComponentType) => {
    requestStore.reset();
    requestStore.add(request);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Pre-seed balance — but useDecisionContext (staleTime:0) will refetch anyway.
    // We control what the refetch returns via this seed (MSW not needed for stories).
    qc.setQueryData(QUERY_KEYS.balance(request.employeeId, request.locationId, request.policy), {
      employeeId: request.employeeId,
      locationId: request.locationId,
      policy: request.policy,
      available: balanceAvailable,
      asOf: now,
      version,
    });
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof RequestReviewCard> = {
  component: RequestReviewCard,
  title: "Manager/RequestReviewCard",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof RequestReviewCard>;

export const ManagerDecisionContext: Story = {
  name: "manager-decision-context — fresh balance shown",
  args: { request: pendingRequest },
  decorators: [withManagerContext(pendingRequest, 10)],
};

export const InsufficientBalance: Story = {
  name: "HCM-rejected — insufficient balance (approve disabled)",
  args: { request: { ...pendingRequest, days: 8 } },
  decorators: [withManagerContext({ ...pendingRequest, days: 8 }, 5)],
};

export const Approving: Story = {
  name: "APPROVING — confirmed-write in flight",
  args: { request: { ...pendingRequest, status: "APPROVING" } },
  decorators: [withManagerContext({ ...pendingRequest, status: "APPROVING" }, 10)],
};

export const NeedsAttention: Story = {
  name: "NEEDS_ATTENTION — HCM-silently-wrong after verify",
  args: { request: { ...pendingRequest, status: "NEEDS_ATTENTION" } },
  decorators: [withManagerContext({ ...pendingRequest, status: "NEEDS_ATTENTION" }, 10)],
};

export const Approved: Story = {
  name: "APPROVED — terminal state",
  args: {
    request: { ...pendingRequest, status: "APPROVED", decidedAt: now },
  },
  decorators: [
    withManagerContext({ ...pendingRequest, status: "APPROVED", decidedAt: now }, 7),
  ],
};

export const Denied: Story = {
  name: "DENIED — terminal state",
  args: {
    request: { ...pendingRequest, status: "DENIED", decidedAt: now },
  },
  decorators: [
    withManagerContext({ ...pendingRequest, status: "DENIED", decidedAt: now }, 10),
  ],
};
