import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { BalanceCard } from "./BalanceCard";

const now = new Date().toISOString();
const staleAsOf = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 min ago — past 5-min threshold

const baseBalance = {
  employeeId: "emp-1",
  locationId: "loc-nyc",
  policy: "PTO",
  available: 10,
  asOf: now,
  version: 3,
};

const meta: Meta<typeof BalanceCard> = {
  component: BalanceCard,
  title: "Employee/BalanceCard",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof BalanceCard>;

export const Normal: Story = {
  name: "normal",
  args: { balance: baseBalance, pendingHold: 0, isStale: false },
};

export const Loading: Story = {
  name: "loading",
  args: { balance: baseBalance, pendingHold: 0, isStale: false, isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("balance-card-loading")).toBeInTheDocument();
  },
};

// ✅ stale — play asserts stale badge is visible
export const Stale: Story = {
  name: "stale",
  args: {
    balance: { ...baseBalance, asOf: staleAsOf },
    pendingHold: 0,
    isStale: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("stale-badge")).toBeInTheDocument();
    await expect(canvas.getByTestId("stale-badge")).toHaveTextContent("stale");
  },
};

// ✅ optimistic-pending — play asserts pendingHold overlay is shown
export const OptimisticPending: Story = {
  name: "optimistic-pending",
  args: {
    balance: baseBalance,
    pendingHold: 3,
    isStale: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("pending-hold")).toBeInTheDocument();
    await expect(canvas.getByTestId("pending-hold")).toHaveTextContent("3 days pending");
    // Effective available = 10 - 3 = 7
    await expect(canvas.getByTestId("available-days")).toHaveTextContent("7");
  },
};

// ✅ optimistic-rolled-back — play asserts NO pending hold after rollback
export const OptimisticRolledBack: Story = {
  name: "optimistic-rolled-back — zero hold after rollback",
  args: {
    balance: baseBalance,
    pendingHold: 0,
    isStale: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No pending-hold element — the overlay was rolled back
    await expect(canvas.queryByTestId("pending-hold")).not.toBeInTheDocument();
    // Full available is restored
    await expect(canvas.getByTestId("available-days")).toHaveTextContent("10");
  },
};

export const Error: Story = {
  name: "error",
  args: {
    balance: baseBalance,
    pendingHold: 0,
    isStale: false,
    error: "fetch failed: 503",
  },
};

export const Empty: Story = {
  name: "empty — zero balance",
  args: {
    balance: { ...baseBalance, available: 0 },
    pendingHold: 0,
    isStale: false,
  },
};
