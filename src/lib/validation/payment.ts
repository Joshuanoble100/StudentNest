import { z } from "zod";
import { uuidSchema } from "./common";

export const paymentPurposes = [
  "FEATURED_LISTING",
  "LISTING_PROMOTION",
  "VERIFIED_LANDLORD_SERVICE",
  "PREMIUM_TOOLS",
] as const;

/**
 * Amounts are never accepted from the client — the server prices the purpose
 * from FEATURE_PRICES. Allowing a client-supplied amount would let anyone pay
 * ₦0.01 for a featured placement.
 */
export const paymentCheckoutSchema = z.object({
  purpose: z.enum(paymentPurposes),
  propertyId: uuidSchema.optional(),
});
export type PaymentCheckoutInput = z.infer<typeof paymentCheckoutSchema>;

export const mockCompleteSchema = z.object({
  reference: z.string().trim().min(6).max(64),
});
