import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { RequestRow } from "./RequestRow";

const base = {
  id: "req-001",
  employeeId: "emp-1",
  locationId: "loc-nyc",
  policy: "PTO",
  days: 3,
  submittedAt: new Date().toISOString(),
};

const meta: Meta<typeof RequestRow> = {
  component: RequestRow,
  title: "Employee/RequestRow",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RequestRow>;

export const Pending: Story = {
  name: "PENDING",
  args: { request: { ...base, status: "PENDING" } },
};

export const Approving: Story = {
  name: "APPROVING",
  args: { request: { ...base, status: "APPROVING" } },
};

export const Approved: Story = {
  name: "APPROVED",
  args: { request: { ...base, status: "APPROVED", decidedAt: new Date().toISOString() } },
};

// ✅ HCM-rejected — play asserts DENIED badge shown, no false positive
export const Denied: Story = {
  name: "DENIED — HCM-rejected",
  args: { request: { ...base, status: "DENIED", decidedAt: new Date().toISOString() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("request-status-denied")).toBeInTheDocument();
    // No approved indicator present
    await expect(canvas.queryByTestId("request-status-approved")).not.toBeInTheDocument();
  },
};

// ✅ HCM-silently-wrong — play asserts NEEDS_ATTENTION shown, APPROVED never appeared
export const NeedsAttention: Story = {
  name: "NEEDS_ATTENTION — HCM-silently-wrong",
  args: { request: { ...base, status: "NEEDS_ATTENTION" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("request-status-needs_attention")).toBeInTheDocument();
    // APPROVED must not be present — the silent-wrong was caught before claiming approval
    await expect(canvas.queryByTestId("request-status-approved")).not.toBeInTheDocument();
    await expect(canvas.queryByText("APPROVED")).not.toBeInTheDocument();
  },
};

// ✅ optimistic-rolled-back — play asserts ROLLED_BACK, not APPROVED or PENDING
export const RolledBack: Story = {
  name: "ROLLED_BACK — optimistic-rolled-back",
  args: { request: { ...base, status: "ROLLED_BACK" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("request-status-rolled_back")).toBeInTheDocument();
    await expect(canvas.queryByTestId("request-status-approved")).not.toBeInTheDocument();
  },
};
