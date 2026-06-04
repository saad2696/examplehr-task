import React, { useState } from "react";
import { expect, within, userEvent, waitFor } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedNumber } from "./AnimatedNumber";

const meta: Meta<typeof AnimatedNumber> = {
  component: AnimatedNumber,
  title: "Shared/AnimatedNumber",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof AnimatedNumber>;

export const Static: Story = {
  name: "static — exact value on mount",
  args: { value: 10 },
  render: (args) => (
    <div data-testid="num" style={{ fontSize: 32, fontWeight: 700 }}>
      <AnimatedNumber {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("num")).toHaveTextContent("10");
  },
};

export const CountsDownOnChange: Story = {
  name: "approve — eases from 10 to 8",
  render: () => {
    const [value, setValue] = useState(10);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div data-testid="num" style={{ fontSize: 40, fontWeight: 700, color: "#1d4ed8" }}>
          <AnimatedNumber value={value} /> days
        </div>
        <button data-testid="approve" onClick={() => setValue(8)}>
          Approve (−2)
        </button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("num")).toHaveTextContent("10");
    await userEvent.click(canvas.getByTestId("approve"));
    await waitFor(() => expect(canvas.getByTestId("num")).toHaveTextContent("8"), {
      timeout: 2000,
    });
  },
};
