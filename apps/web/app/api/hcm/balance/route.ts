import { NextResponse } from "next/server";
import { hcmStore } from "@repo/hcm-mock";
import { BalanceQuerySchema, BalanceWriteBodySchema } from "@repo/contracts";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = BalanceQuerySchema.safeParse({
    employeeId: url.searchParams.get("employeeId"),
    locationId: url.searchParams.get("locationId"),
    policy: url.searchParams.get("policy"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { employeeId, locationId, policy } = parsed.data;
  const balance = await hcmStore.readBalance(employeeId, locationId, policy);
  return NextResponse.json(balance);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BalanceWriteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { employeeId, locationId, policy, delta, version } = parsed.data;
  const result = await hcmStore.writeBalance(employeeId, locationId, policy, delta, version);
  return NextResponse.json(result);
}
