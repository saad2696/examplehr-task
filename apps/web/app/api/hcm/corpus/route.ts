import { NextResponse } from "next/server";
import { hcmStore } from "@repo/hcm-mock";

export async function GET(): Promise<Response> {
  const balances = await hcmStore.readCorpus({ latencyMs: 800 });
  return NextResponse.json(balances);
}
