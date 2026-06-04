export const STALE_THRESHOLD_MS = 30 * 1000;

export function isBalanceStale(asOf: string, thresholdMs = STALE_THRESHOLD_MS): boolean {
  return Date.now() - new Date(asOf).getTime() > thresholdMs;
}
