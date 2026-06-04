export const QUERY_KEYS = {
  corpus: () => ["corpus"] as const,
  balance: (employeeId: string, locationId: string, policy: string) =>
    ["balance", employeeId, locationId, policy] as const,
};
