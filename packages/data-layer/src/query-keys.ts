export const QUERY_KEYS = {
  corpus: () => ["corpus"] as const,
  balance: (employeeId: string, locationId: string, policy: string) =>
    ["balance", employeeId, locationId, policy] as const,
  pendingHold: (employeeId: string, locationId: string, policy: string) =>
    ["pendingHold", employeeId, locationId, policy] as const,
  requests: () => ["requests"] as const,
};
