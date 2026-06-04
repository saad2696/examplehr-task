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
};

export const Stale: Story = {
  name: "stale",
  args: {
    balance: { ...baseBalance, asOf: staleAsOf },
    pendingHold: 0,
    isStale: true,
  },
};

export const OptimisticPending: Story = {
  name: "optimistic-pending",
  args: {
    balance: baseBalance,
    pendingHold: 3,
    isStale: false,
  },
};

export const OptimisticRolledBack: Story = {
  name: "optimistic-rolled-back — zero hold after rollback",
  args: {
    balance: baseBalance,
    pendingHold: 0,
    isStale: false,
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
