import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BalanceList } from "./BalanceList";
import { QUERY_KEYS } from "@repo/data-layer";

const now = new Date().toISOString();
const staleAsOf = new Date(Date.now() - 6 * 60 * 1000).toISOString();

function makeBalance(policy: string, available: number, asOf = now, version = 1) {
  return { employeeId: "emp-1", locationId: "loc-nyc", policy, available, asOf, version };
}

/** Pre-seed a QueryClient with corpus + per-cell data, then wrap the story. */
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
        qc.setQueryData(QUERY_KEYS.pendingHold(b.employeeId, b.locationId, b.policy), pendingHolds[holdKey]);
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

export const Loading: Story = {
  name: "loading — skeleton while corpus fetches",
  // No pre-seed → corpus query is pending → loading skeletons render
  decorators: [
    () => {
      // QueryClient with no data and a never-resolving queryFn
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(BalanceList, { employeeId: "emp-1", locationId: "loc-nyc" }),
      );
    },
  ],
};

export const Empty: Story = {
  name: "empty — no balance rows for this location",
  decorators: [withPreseededData([])],
};

export const Normal: Story = {
  name: "normal — two policies",
  decorators: [withPreseededData([makeBalance("PTO", 10), makeBalance("SICK", 5)])],
};

export const Stale: Story = {
  name: "stale — data past 5-min threshold",
  decorators: [
    withPreseededData([
      makeBalance("PTO", 8, staleAsOf),
      makeBalance("SICK", 3, staleAsOf),
    ]),
  ],
};

export const OptimisticPending: Story = {
  name: "optimistic-pending — pending hold overlaid",
  decorators: [
    withPreseededData([makeBalance("PTO", 10), makeBalance("SICK", 5)], {
      "emp-1:loc-nyc:PTO": 3,
    }),
  ],
};

export const BalanceRefreshedMidSession: Story = {
  name: "balance-refreshed-mid-session — anniversary bonus landed",
  decorators: [
    withPreseededData([
      makeBalance("PTO", 15, now, 2), // bonus bumped available + version
    ]),
  ],
};
