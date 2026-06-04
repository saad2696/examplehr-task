import { NextResponse } from "next/server";
import { hcmStore } from "@repo/hcm-mock";
import { FaultBodySchema } from "@repo/contracts";

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = FaultBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { key, fault } = parsed.data;
  hcmStore.setFault(key, fault);
  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<Response> {
  hcmStore.clearFaults();
  return NextResponse.json({ ok: true });
}
