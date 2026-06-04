import { describe, it, expect, vi, afterEach } from "vitest";
import { isBalanceStale, STALE_THRESHOLD_MS } from "./stale";

afterEach(() => vi.useRealTimers());

describe("isBalanceStale", () => {
  it("returns false when asOf is recent", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const asOf = new Date(now - 60_000).toISOString(); // 1 min ago
    expect(isBalanceStale(asOf)).toBe(false);
  });

  it("returns true when asOf exceeds STALE_THRESHOLD_MS", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const asOf = new Date(now - STALE_THRESHOLD_MS - 1).toISOString();
    expect(isBalanceStale(asOf)).toBe(true);
  });

  it("returns false at exactly the threshold boundary", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const asOf = new Date(now - STALE_THRESHOLD_MS).toISOString();
    expect(isBalanceStale(asOf)).toBe(false);
  });

  it("accepts a custom threshold", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const asOf = new Date(now - 10_000).toISOString(); // 10s ago
    expect(isBalanceStale(asOf, 5_000)).toBe(true);
    expect(isBalanceStale(asOf, 60_000)).toBe(false);
  });
});
