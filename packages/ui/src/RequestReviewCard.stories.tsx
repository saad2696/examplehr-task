import React from "react";
import { expect, within, waitFor } from "@storybook/test";
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

// ✅ manager-decision-context — balance visible, approve enabled when sufficient
export const ManagerDecisionContext: Story = {
  name: "manager-decision-context — fresh balance shown",
  args: { request: pendingRequest },
  decorators: [withManagerContext(pendingRequest, 10)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Balance context is shown to the manager — the decision-balance element appears
    await waitFor(() =>
      expect(canvas.getByTestId("balance-available")).toBeInTheDocument(),
    );
    await expect(canvas.getByTestId("balance-available")).toHaveTextContent("10 days available");
    // Approve is enabled (10 available ≥ 3 requested)
    const approveBtn = canvas.getByTestId("approve-btn");
    await expect(approveBtn).not.toBeDisabled();
    // No false outcome shown — only action buttons
    await expect(canvas.queryByTestId("approved-msg")).not.toBeInTheDocument();
    await expect(canvas.queryByTestId("denied-msg")).not.toBeInTheDocument();
  },
};

// ✅ HCM-rejected — insufficient balance: approve button disabled, badge shown
export const InsufficientBalance: Story = {
  name: "HCM-rejected — insufficient balance (approve disabled)",
  args: { request: { ...pendingRequest, days: 8 } },
  decorators: [withManagerContext({ ...pendingRequest, days: 8 }, 5)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByTestId("balance-available")).toBeInTheDocument(),
    );
    // Insufficient badge shown
    await expect(canvas.getByTestId("insufficient-badge")).toBeInTheDocument();
    // Approve button is disabled — manager cannot approve with insufficient balance
    await expect(canvas.getByTestId("approve-btn")).toBeDisabled();
  },
};

// ✅ NEEDS_ATTENTION — reconciliation banner shown, no APPROVED claim
export const NeedsAttention: Story = {
  name: "NEEDS_ATTENTION — HCM-silently-wrong after verify",
  args: { request: { ...pendingRequest, status: "NEEDS_ATTENTION" } },
  decorators: [withManagerContext({ ...pendingRequest, status: "NEEDS_ATTENTION" }, 10)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("reconciliation-banner")).toBeInTheDocument();
    // APPROVED must never have appeared
    await expect(canvas.queryByTestId("approved-msg")).not.toBeInTheDocument();
    await expect(canvas.queryByText("APPROVED")).not.toBeInTheDocument();
  },
};

export const Approving: Story = {
  name: "APPROVING — confirmed-write in flight",
  args: { request: { ...pendingRequest, status: "APPROVING" } },
  decorators: [withManagerContext({ ...pendingRequest, status: "APPROVING" }, 10)],
};

export const Approved: Story = {
  name: "APPROVED — terminal state",
  args: {
    request: { ...pendingRequest, status: "APPROVED", decidedAt: now },
  },
  decorators: [
    withManagerContext({ ...pendingRequest, status: "APPROVED", decidedAt: now }, 7),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("approved-msg")).toBeInTheDocument();
    // Action buttons gone in terminal state
    await expect(canvas.queryByTestId("approve-btn")).not.toBeInTheDocument();
  },
};

export const Denied: Story = {
  name: "DENIED — terminal state",
  args: {
    request: { ...pendingRequest, status: "DENIED", decidedAt: now },
  },
  decorators: [
    withManagerContext({ ...pendingRequest, status: "DENIED", decidedAt: now }, 10),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("denied-msg")).toBeInTheDocument();
    await expect(canvas.queryByTestId("approve-btn")).not.toBeInTheDocument();
  },
};
