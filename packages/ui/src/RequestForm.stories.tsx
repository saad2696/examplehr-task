import type { Meta, StoryObj } from "@storybook/react";
import { RequestForm } from "./RequestForm";

const meta: Meta<typeof RequestForm> = {
  component: RequestForm,
  title: "Employee/RequestForm",
  parameters: { layout: "centered" },
  args: {
    employeeId: "emp-1",
    locationId: "loc-nyc",
    policy: "PTO",
    effectiveAvailable: 10,
  },
};

export default meta;
type Story = StoryObj<typeof RequestForm>;

export const Normal: Story = {
  name: "normal — 10 days available",
};

export const LowBalance: Story = {
  name: "low balance — 1 day available",
  args: { effectiveAvailable: 1 },
};

export const ZeroBalance: Story = {
  name: "zero balance — form should prevent over-request",
  args: { effectiveAvailable: 0 },
};
