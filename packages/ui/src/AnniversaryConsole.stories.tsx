import React from "react";
import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnniversaryConsole } from "./AnniversaryConsole";
import { QUERY_KEYS } from "@repo/data-layer";

const now = new Date().toISOString();

function makeBalance(employeeId: string, policy: string, available: number) {
  return { employeeId, locationId: "loc-nyc", policy, available, asOf: now, version: 1 };
}

const NAMES = { "emp-maya": "Maya Patel", "emp-alex": "Alex Chen" };

function withCorpus(balances: ReturnType<typeof makeBalance>[]) {
  return (Story: React.ComponentType) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(QUERY_KEYS.corpus(), balances);
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof AnniversaryConsole> = {
  component: AnniversaryConsole,
  title: "Admin/AnniversaryConsole",
  parameters: { layout: "padded" },
  args: { employeeNames: NAMES },
};

export default meta;
type Story = StoryObj<typeof AnniversaryConsole>;

export const Loading: Story = {
  name: "loading — corpus still fetching",
  decorators: [
    () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(AnniversaryConsole, { employeeNames: NAMES }),
      );
    },
  ],
};

export const Populated: Story = {
  name: "populated — grantable cells listed",
  decorators: [
    withCorpus([
      makeBalance("emp-maya", "PTO", 10),
      makeBalance("emp-maya", "SICK", 5),
      makeBalance("emp-alex", "PTO", 2),
    ]),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByTestId("target-select");
    await expect(select.querySelectorAll("option")).toHaveLength(3);
    await expect(canvas.getByTestId("grant-button")).toBeDisabled();
  },
};
