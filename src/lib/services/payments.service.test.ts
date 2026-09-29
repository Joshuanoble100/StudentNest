import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FEATURE_PRICES, verifyWebhookSignature } from "@/lib/services/payments.service";

const key = process.env.PAYSTACK_SECRET_KEY ?? "";
const sign = (body: string) => createHmac("sha512", key).update(body).digest("hex");

const body = JSON.stringify({
  event: "charge.success",
  data: { reference: "sn_abc123", status: "success", amount: 500000 },
});

describe("verifyWebhookSignature", () => {
  it("accepts a body signed with the provider secret", () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects the same signature over a tampered body", () => {
    // The classic attack: replay a valid signature but change the amount or
    // reference. Hashing the raw body is what makes this fail.
    const tampered = body.replace('"amount":500000', '"amount":1');
    expect(verifyWebhookSignature(tampered, sign(body))).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it("rejects a forged signature", () => {
    expect(verifyWebhookSignature(body, sign(body).slice(0, -4) + "0000")).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef")).toBe(false);
  });

  it("rejects a signature computed with a different key", () => {
    const other = createHmac("sha512", "not-the-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, other)).toBe(false);
  });
});

describe("FEATURE_PRICES", () => {
  it("prices every optional extra in whole kobo", () => {
    for (const [purpose, amount] of Object.entries(FEATURE_PRICES)) {
      expect(Number.isInteger(amount), `${purpose} must be a whole kobo amount`).toBe(true);
      expect(amount, `${purpose} must not be free or negative`).toBeGreaterThan(0);
    }
  });

  it("keeps prices server-side constants, not client input", () => {
    // The checkout schema accepts only a purpose; the amount is looked up here.
    // If a price ever became 0 the platform would be giving paid extras away.
    expect(Object.keys(FEATURE_PRICES)).toEqual([
      "FEATURED_LISTING",
      "LISTING_PROMOTION",
      "VERIFIED_LANDLORD_SERVICE",
      "PREMIUM_TOOLS",
    ]);
  });
});
