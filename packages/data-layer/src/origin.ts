export function getOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}
