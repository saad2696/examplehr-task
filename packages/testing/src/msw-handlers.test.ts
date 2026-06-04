import { describe, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./msw-server";
import { hcmStore } from "@repo/hcm-mock";
import { defineTransportScenarios } from "./transport-scenarios";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  hcmStore.reset();
});
afterAll(() => server.close());

// Pass a wrapper so `fetch` is resolved at call time (after server.listen patches it),
// not at module-evaluation time when the reference would point to the original fetch.
describe("MSW transport", () => {
  defineTransportScenarios((url, init) => fetch(url, init));
});
