import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "@repo/testing/msw-server";
import { hcmStore } from "@repo/hcm-mock";
import { testQueryClient } from "./test-utils";
import { requestStore } from "./request-store";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  hcmStore.reset();
  requestStore.reset();
  testQueryClient.clear();
});
afterAll(() => server.close());
