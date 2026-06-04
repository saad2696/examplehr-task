import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RequestStatusSchema = z.enum([
  "PENDING",
  "APPROVING",
  "APPROVED",
  "DENIED",
  "NEEDS_ATTENTION",
  "ROLLED_BACK",
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const ConflictTypeSchema = z.enum([
  "INSUFFICIENT_BALANCE",
  "INVALID_DIMENSION",
  "VERSION_CONFLICT",
]);
export type ConflictType = z.infer<typeof ConflictTypeSchema>;

export const FaultTypeSchema = z.enum([
  "silent-wrong",
  "silent-failure",
  "conflict",
  "latency",
  "none",
]);
export type FaultType = z.infer<typeof FaultTypeSchema>;

// ─── Core HCM models ──────────────────────────────────────────────────────────

/**
 * A single authoritative balance cell owned by HCM.
 * Value constraints (not just shape) are the concrete mechanism behind
 * "assume a 200 OK can still be wrong" — Zod rejects shape-valid but
 * value-invalid responses at the boundary.
 */
export const BalanceSchema = z.object({
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  policy: z.string().min(1),
  available: z.number().nonnegative(),
  asOf: z.string().min(1),
  version: z.number().int().nonnegative(),
});
export type Balance = z.infer<typeof BalanceSchema>;

/** ExampleHR-owned request entity. Status drives the state machine (Brief §8). */
export const TimeOffRequestSchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  policy: z.string().min(1),
  days: z.number().positive(),
  status: RequestStatusSchema,
  submittedAt: z.string().min(1),
  decidedAt: z.string().optional(),
  /** Balance snapshot shown to the manager at decision time (Brief §9). */
  balanceContext: z
    .object({
      available: z.number().nonnegative(),
      asOf: z.string().min(1),
    })
    .optional(),
});
export type TimeOffRequest = z.infer<typeof TimeOffRequestSchema>;

/**
 * HCM write result — ok:true is NOT sufficient to trust the write.
 * Post-write per-cell re-read is mandatory (Brief §6).
 */
export const HcmWriteResultSchema = z.object({
  ok: z.boolean(),
  conflict: ConflictTypeSchema.optional(),
  balance: BalanceSchema.optional(),
});
export type HcmWriteResult = z.infer<typeof HcmWriteResultSchema>;

// ─── API request/response bodies (validated at route boundary) ────────────────

export const BalanceQuerySchema = z.object({
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  policy: z.string().min(1),
  latency: z.coerce.number().optional(),
});
export type BalanceQuery = z.infer<typeof BalanceQuerySchema>;

export const BalanceWriteBodySchema = z.object({
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  policy: z.string().min(1),
  delta: z.number(),
  version: z.number().int().nonnegative(),
});
export type BalanceWriteBody = z.infer<typeof BalanceWriteBodySchema>;

export const AnniversaryTriggerBodySchema = z.object({
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  policy: z.string().min(1),
  bonus: z.number().positive(),
});
export type AnniversaryTriggerBody = z.infer<typeof AnniversaryTriggerBodySchema>;

export const FaultBodySchema = z.object({
  /** "employeeId:locationId:policy" or broader key */
  key: z.string().min(1),
  fault: FaultTypeSchema,
});
export type FaultBody = z.infer<typeof FaultBodySchema>;
