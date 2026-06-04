import type { Meta, StoryObj } from "@storybook/react";
import { ReconciliationBanner } from "./ReconciliationBanner";

const meta: Meta<typeof ReconciliationBanner> = {
  component: ReconciliationBanner,
  title: "Manager/ReconciliationBanner",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ReconciliationBanner>;

export const NeedsAttention: Story = {
  name: "NEEDS_ATTENTION — HCM-silently-wrong",
  args: { status: "NEEDS_ATTENTION" },
};

export const NeedsAttentionWithRetry: Story = {
  name: "NEEDS_ATTENTION — with retry + dismiss",
  args: {
    status: "NEEDS_ATTENTION",
    onRetry: () => alert("retry"),
    onDismiss: () => alert("dismiss"),
  },
};

export const Approving: Story = {
  name: "APPROVING — in-flight confirmation",
  args: { status: "APPROVING" },
};
