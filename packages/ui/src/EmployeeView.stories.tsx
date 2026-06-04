import React from "react";
import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmployeeView } from "./EmployeeView";
import { QUERY_KEYS } from "@repo/data-layer";

const now = new Date().toISOString();

function makeBalance(policy: string, available: number) {
  return { employeeId: "emp-maya", locationId: "loc-nyc", policy, available, asOf: now, version: 1 };
}

const BALANCES = [makeBalance("PTO", 10), makeBalance("SICK", 5)];

function withData(pendingHolds: Record<string, number> = {}) {
  return (Story: React.ComponentType) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(QUERY_KEYS.corpus(), BALANCES);
    for (const b of BALANCES) {
      qc.setQueryData(QUERY_KEYS.balance(b.employeeId, b.locationId, b.policy), b);
      const k = `${b.employeeId}:${b.locationId}:${b.policy}`;
      if (k in pendingHolds) {
        qc.setQueryData(QUERY_KEYS.pendingHold(b.employeeId, b.locationId, b.policy), pendingHolds[k]);
      }
    }
    qc.setQueryData(QUERY_KEYS.requests(), []);
    return React.createElement(QueryClientProvider, { client: qc }, React.createElement(Story));
  };
}

const meta: Meta<typeof EmployeeView> = {
  component: EmployeeView,
  title: "Employee/EmployeeView",
  parameters: { layout: "padded" },
  args: { employeeId: "emp-maya", locationId: "loc-nyc", employeeName: "Maya Patel" },
};

export default meta;
type Story = StoryObj<typeof EmployeeView>;

export const Default: Story = {
  name: "default — name + vacation tab",
  decorators: [withData()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("employee-name")).toHaveTextContent("Maya Patel");
    await expect(canvas.getByTestId("policy-tab-PTO")).toHaveAttribute("aria-selected", "true");
  },
};

export const WithPicker: Story = {
  name: "with employee picker — switch between employees",
  args: {
    employees: [
      { employeeId: "emp-maya", locationId: "loc-nyc", name: "Maya Patel" },
      { employeeId: "emp-alex", locationId: "loc-nyc", name: "Alex Chen" },
    ],
  },
  decorators: [withData()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const picker = canvas.getByTestId("employee-picker") as HTMLSelectElement;
    await expect(picker.querySelectorAll("option")).toHaveLength(2);
    await expect(picker.value).toBe("emp-maya:loc-nyc");
  },
};

export const SickLeaveTab: Story = {
  name: "sick leave — switch to SICK and request against it",
  decorators: [withData()],
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("policy-tab-SICK"));
    await expect(canvas.getByTestId("policy-tab-SICK")).toHaveAttribute("aria-selected", "true");
    const input = canvas.getByTestId("days-input") as HTMLInputElement;
    await expect(input).toHaveAttribute("max", "5");
  },
};
