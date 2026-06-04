import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ExampleHR — Time Off",
  description: "Employee time-off request and approval",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
