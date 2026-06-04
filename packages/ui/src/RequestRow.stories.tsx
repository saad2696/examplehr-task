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

export const Denied: Story = {
  name: "DENIED — HCM-rejected",
  args: { request: { ...base, status: "DENIED", decidedAt: new Date().toISOString() } },
};

export const NeedsAttention: Story = {
  name: "NEEDS_ATTENTION — HCM-silently-wrong",
  args: { request: { ...base, status: "NEEDS_ATTENTION" } },
};

export const RolledBack: Story = {
  name: "ROLLED_BACK — optimistic-rolled-back",
  args: { request: { ...base, status: "ROLLED_BACK" } },
};
