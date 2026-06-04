import type { TimeOffRequest } from "@repo/contracts";

let requests: TimeOffRequest[] = [];

export const requestStore = {
  add(req: TimeOffRequest): void {
    requests = [...requests, req];
  },
  update(id: string, updates: Partial<TimeOffRequest>): void {
    requests = requests.map((r) => (r.id === id ? { ...r, ...updates } : r));
  },
  getAll(): TimeOffRequest[] {
    return requests;
  },
  get(id: string): TimeOffRequest | undefined {
    return requests.find((r) => r.id === id);
  },
  reset(): void {
    requests = [];
  },
};
