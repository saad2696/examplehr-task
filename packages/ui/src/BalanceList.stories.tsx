import React from "react";
import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BalanceList } from "./BalanceList";
import { QUERY_KEYS } from "@repo/data-layer";

const now = new Date().toISOString();
const staleAsOf = new Date(Date.now() - 6 * 60 * 1000).toISOString();

function makeBalance(policy: string, available: number, asOf = now, version = 1) {
  return { employeeId: "emp-1", locationId: "loc-nyc", policy, available, asOf, version };
}

function withPreseededData(
  balances: ReturnType<typeof makeBalance>[],
  pendingHolds: Record<string, number> = {},
) {
  return (Story: React.ComponentType) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(QUERY_KEYS.corpus(), balances);
    for (const b of balances) {
      qc.setQueryData(QUERY_KEYS.balance(b.employeeId, b.locationId, b.policy), b);
      const holdKey = `${b.employeeId}:${b.locationId}:${b.policy}`;
      if (holdKey in pendingHolds) {
        qc.setQueryData(
          QUERY_KEYS.pendingHold(b.employeeId, b.locationId, b.policy),
          pendingHolds[holdKey],
        );
      }
    }
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof BalanceList> = {
  component: BalanceList,
  title: "Employee/BalanceList",
  parameters: { layout: "padded" },
  args: { employeeId: "emp-1", locationId: "loc-nyc" },
};

export default meta;
type Story = StoryObj<typeof BalanceList>;

// ✅ loading — skeletons while corpus fetches
export const Loading: Story = {
  name: "loading — skeleton while corpus fetches",
  decorators: [
    () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(BalanceList, { employeeId: "emp-1", locationId: "loc-nyc" }),
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("balance-list-loading")).toBeInTheDocument();
  },
};

// ✅ empty — no rows for location
export const Empty: Story = {
  name: "empty — no balance rows for this location",
  decorators: [withPreseededData([])],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("balance-list-empty")).toBeInTheDocument();
  },
};

export const Normal: Story = {
  name: "normal — two policies",
  decorators: [withPreseededData([makeBalance("PTO", 10), makeBalance("SICK", 5)])],
};

// ✅ stale — stale badges visible on all cards
export const Stale: Story = {
  name: "stale — data past 5-min threshold",
  decorators: [
    withPreseededData([
      makeBalance("PTO", 8, staleAsOf),
      makeBalance("SICK", 3, staleAsOf),
    ]),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const staleBadges = await canvas.findAllByTestId("stale-badge");
    await expect(staleBadges.length).toBeGreaterThan(0);
  },
};

// ✅ optimistic-pending — pendingHold overlay survives
export const OptimisticPending: Story = {
  name: "optimistic-pending — pending hold overlaid",
  decorators: [
    withPreseededData([makeBalance("PTO", 10), makeBalance("SICK", 5)], {
      "emp-1:loc-nyc:PTO": 3,
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // PTO card should show pending-hold indicator
    await expect(canvas.getByTestId("pending-hold")).toBeInTheDocument();
    await expect(canvas.getByTestId("pending-hold")).toHaveTextContent("3 days pending");
    // Effective available = 10 - 3 = 7
    const availableDays = canvas.getByTestId("available-days");
    await expect(availableDays).toHaveTextContent("7");
  },
};

// ✅ balance-refreshed-mid-session — anniversary bonus landed, overlay still present
export const BalanceRefreshedMidSession: Story = {
  name: "balance-refreshed-mid-session — anniversary bonus landed",
  decorators: [
    withPreseededData(
      [makeBalance("PTO", 15, now, 2)], // version 2: bonus applied
      { "emp-1:loc-nyc:PTO": 3 },       // pending hold still in place
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Refreshed balance (15) minus pending hold (3) = 12 effective
    await expect(canvas.getByTestId("available-days")).toHaveTextContent("12");
    // Pending hold overlay survived the balance refresh
    await expect(canvas.getByTestId("pending-hold")).toHaveTextContent("3 days pending");
  },
};
