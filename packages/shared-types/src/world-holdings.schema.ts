import { z } from "zod";

export const HoldingSchema = z.object({
  holdingId: z.string(),
  unlockedByMissionId: z.string(),
  unlockedAt: z.string(),
});
export type Holding = z.infer<typeof HoldingSchema>;

export const GetHoldingsResponseSchema = z.object({
  holdings: z.array(HoldingSchema),
});
export type GetHoldingsResponse = z.infer<typeof GetHoldingsResponseSchema>;

export const UnlockHoldingRequestSchema = z.object({
  holdingId: z.string(),
  unlockedByMissionId: z.string(),
});
export type UnlockHoldingRequest = z.infer<typeof UnlockHoldingRequestSchema>;

export const UnlockHoldingResponseSchema = z.object({
  success: z.literal(true),
  holding: HoldingSchema,
});
export type UnlockHoldingResponse = z.infer<typeof UnlockHoldingResponseSchema>;
