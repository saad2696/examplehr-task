import { NextResponse } from "next/server";
import { hcmStore } from "@repo/hcm-mock";
import { AnniversaryTriggerBodySchema } from "@repo/contracts";

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = AnniversaryTriggerBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { employeeId, locationId, policy, bonus } = parsed.data;
  hcmStore.triggerAnniversary(employeeId, locationId, policy, bonus);
  return NextResponse.json({ ok: true });
}
