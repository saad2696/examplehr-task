import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export function TestQueryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );
}
