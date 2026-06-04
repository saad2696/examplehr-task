import { describe, beforeEach, afterEach } from "vitest";
import { hcmStore } from "@repo/hcm-mock";
import { defineTransportScenarios } from "@repo/testing";

import { GET as balanceGET, POST as balancePOST } from "../balance/route";
import { GET as corpusGET } from "../corpus/route";
import { POST as anniversaryPOST } from "../trigger/anniversary/route";
import { POST as faultPOST, DELETE as faultDELETE } from "../fault/route";

beforeEach(() => hcmStore.reset());
afterEach(() => hcmStore.reset());

/**
 * Adapter that dispatches fetch-style calls directly to the route handlers,
 * bypassing HTTP entirely. This proves the handler logic is correct
 * independent of the MSW transport layer.
 */
async function routeHandlerAdapter(url: string, init?: RequestInit): Promise<Response> {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname;
  const method = (init?.method ?? "GET").toUpperCase();
  const req = new Request(url, init);

  if (pathname === "/api/hcm/balance") {
    if (method === "GET") return balanceGET(req);
    if (method === "POST") return balancePOST(req);
  }
  if (pathname === "/api/hcm/corpus") {
    return corpusGET();
  }
  if (pathname === "/api/hcm/trigger/anniversary") {
    return anniversaryPOST(req);
  }
  if (pathname === "/api/hcm/fault") {
    if (method === "POST") return faultPOST(req);
    if (method === "DELETE") return faultDELETE();
  }
  throw new Error(`No handler registered for ${method} ${pathname}`);
}

describe("Route handler transport", () => {
  defineTransportScenarios(routeHandlerAdapter);
});
