import { hcmStore } from "@repo/hcm-mock";

let seeded = false;

export function ensureDemoData(): void {
  if (seeded) return;
  seeded = true;

  // Maya — NYC office. 10 PTO + 5 SICK (matches the brief's "10 days available" example)
  hcmStore.setBalance("emp-maya", "loc-nyc", 10, "PTO");
  hcmStore.setBalance("emp-maya", "loc-nyc", 5, "SICK");

  // Maya also has an SF office balance (multi-location demo)
  hcmStore.setBalance("emp-maya", "loc-sf", 4, "PTO");

  // Alex — NYC. No leaves at all (zero balances) — demonstrates the empty/zero state
  hcmStore.setBalance("emp-alex", "loc-nyc", 0, "PTO");
  hcmStore.setBalance("emp-alex", "loc-nyc", 0, "SICK");

  // Jordan — NYC. A third employee for a fuller manager queue
  hcmStore.setBalance("emp-jordan", "loc-nyc", 7, "PTO");
  hcmStore.setBalance("emp-jordan", "loc-nyc", 3, "SICK");
}
