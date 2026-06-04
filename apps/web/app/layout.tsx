import type { Metadata } from "next";
import { Providers } from "./providers";
import { ensureDemoData } from "../lib/demo-seed";

export const metadata: Metadata = {
  title: "ExampleHR — Time Off",
  description: "Employee time-off request and approval",
};

ensureDemoData();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0 }} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
