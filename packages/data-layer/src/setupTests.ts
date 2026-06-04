import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "@repo/testing/msw-server";
import { hcmStore } from "@repo/hcm-mock";
import { testQueryClient } from "./test-utils";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  hcmStore.reset();
  testQueryClient.clear();
});
afterAll(() => server.close());
