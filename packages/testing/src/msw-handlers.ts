import { http, HttpResponse } from "msw";
import { hcmStore } from "@repo/hcm-mock";
import {
  BalanceQuerySchema,
  BalanceWriteBodySchema,
  AnniversaryTriggerBodySchema,
  FaultBodySchema,
} from "@repo/contracts";

export const handlers = [
  http.get("http://*/api/hcm/balance", async ({ request }) => {
    const url = new URL(request.url);
    const parsed = BalanceQuerySchema.safeParse({
      employeeId: url.searchParams.get("employeeId"),
      locationId: url.searchParams.get("locationId"),
      policy: url.searchParams.get("policy"),
    });
    if (!parsed.success) {
      return HttpResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { employeeId, locationId, policy } = parsed.data;
    const balance = await hcmStore.readBalance(employeeId, locationId, policy);
    return HttpResponse.json(balance);
  }),

  http.post("http://*/api/hcm/balance", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = BalanceWriteBodySchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { employeeId, locationId, policy, delta, version } = parsed.data;
    const result = await hcmStore.writeBalance(employeeId, locationId, policy, delta, version);
    return HttpResponse.json(result);
  }),

  http.get("http://*/api/hcm/corpus", async () => {
    const balances = await hcmStore.readCorpus({ latencyMs: 0 });
    return HttpResponse.json(balances);
  }),

  http.post("http://*/api/hcm/trigger/anniversary", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = AnniversaryTriggerBodySchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { employeeId, locationId, policy, bonus } = parsed.data;
    hcmStore.triggerAnniversary(employeeId, locationId, policy, bonus);
    return HttpResponse.json({ ok: true });
  }),

  http.post("http://*/api/hcm/fault", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = FaultBodySchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { key, fault } = parsed.data;
    hcmStore.setFault(key, fault);
    return HttpResponse.json({ ok: true });
  }),

  http.delete("http://*/api/hcm/fault", () => {
    hcmStore.clearFaults();
    return HttpResponse.json({ ok: true });
  }),
];
