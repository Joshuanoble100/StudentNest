import { createHmac, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { env, isProviderConfigured } from "@/lib/env";
import type { PaymentPurpose, Prisma } from "@prisma/client";

/**
 * Payment abstraction (Paystack-ready).
 *
 * Without PAYSTACK_SECRET_KEY the platform runs in mock mode: charges are
 * simulated and marked provider=MOCK so flows stay testable. Core student
 * housing search is NEVER paywalled — payments only cover optional landlord
 * extras (featured listings, promotions, premium tools).
 *
 * Security rule: payment success is ONLY established via webhook
 * verification (HMAC signature check + server-side verify transaction).
 * Frontend "success" callbacks never flip a payment to SUCCESS.
 */

export interface InitializeChargeInput {
  userId: string;
  purpose: PaymentPurpose;
  amountKobo: number;
  propertyId?: string;
  metadata?: Prisma.InputJsonValue;
}

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Purposes that only make sense attached to one of the payer's own listings. */
const LISTING_BOUND_PURPOSES: PaymentPurpose[] = ["FEATURED_LISTING", "LISTING_PROMOTION"];

export interface InitializeChargeResult {
  reference: string;
  authorizationUrl: string | null; // null in mock mode
  provider: "PAYSTACK" | "MOCK";
}

export async function initializeCharge(input: InitializeChargeInput): Promise<InitializeChargeResult> {
  const reference = `sn_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  await prisma.payment.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      amountKobo: input.amountKobo,
      reference,
      propertyId: input.propertyId ?? null,
      metadata: input.metadata ?? undefined,
      provider: env.payments.provider === "paystack" && isProviderConfigured("payments") ? "PAYSTACK" : "MOCK",
    },
  });

  if (env.payments.provider === "paystack" && isProviderConfigured("payments")) {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.payments.paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: (await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } }))?.email,
        amount: input.amountKobo,
        reference,
        currency: "NGN",
        metadata: input.metadata ?? {},
        callback_url: `${env.appUrl}/api/payments/webhook/return?reference=${reference}`,
      }),
    });
    if (!response.ok) {
      throw new Error(`Paystack initialize failed (${response.status})`);
    }
    const json = (await response.json()) as { data: { authorization_url: string } };
    return { reference, authorizationUrl: json.data.authorization_url, provider: "PAYSTACK" };
  }

  // Mock mode: no external redirect. Development UI can "complete" the
  // payment by POSTing the reference to /api/payments/mock/complete.
  console.warn("[payments] running in MOCK mode — set PAYMENT_PROVIDER=paystack and keys to enable real charges");
  return { reference, authorizationUrl: null, provider: "MOCK" };
}

/** Verifies Paystack webhook signature (x-paystack-signature, HMAC sha512). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (env.payments.provider !== "paystack" || !env.payments.paystackSecretKey) return false;
  if (!signature) return false;
  const expected = createHmac("sha512", env.payments.paystackSecretKey)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Processes a charge.success webhook after signature verification.
 * Idempotent via WebhookEvent.eventId uniqueness and payment status checks.
 */
export async function handleChargeSuccess(payload: {
  event: string;
  data: { reference: string; status: string; gateway_response?: string };
}): Promise<void> {
  const eventId = `${payload.event}:${payload.data.reference}`;

  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "PAYSTACK", eventId } },
  });
  if (existing?.processedAt) return;

  await prisma.webhookEvent.create({
    data: { provider: "PAYSTACK", eventId, payload: payload as never },
  });

  // Server-side re-verification with Paystack — never trust the webhook body alone.
  let verified = payload.data.status === "success";
  if (verified && isProviderConfigured("payments")) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payload.data.reference)}`, {
      headers: { Authorization: `Bearer ${env.payments.paystackSecretKey}` },
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { status: string } };
      verified = json.data.status === "success";
    } else {
      verified = false;
    }
  }

  const payment = await prisma.payment.findUnique({ where: { reference: payload.data.reference } });
  if (!payment || payment.status !== "PENDING") {
    await prisma.webhookEvent.update({
      where: { provider_eventId: { provider: "PAYSTACK", eventId } },
      data: { processedAt: new Date(), error: payment ? "payment not pending" : "unknown reference" },
    });
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: verified ? "SUCCESS" : "FAILED",
      providerReference: payload.data.reference,
    },
  });
  await prisma.webhookEvent.update({
    where: { provider_eventId: { provider: "PAYSTACK", eventId } },
    data: { processedAt: new Date() },
  });

  // Grant the purchased feature.
  if (verified && payment.purpose === "FEATURED_LISTING" && payment.propertyId) {
    await prisma.property.update({
      where: { id: payment.propertyId },
      data: { isFeatured: true, featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
  }
}

/** DEVELOPMENT ONLY: completes a mock payment. Disabled in production. */
export async function completeMockPayment(userId: string, reference: string) {
  if (env.isProduction) throw new PaymentError("Mock payments are disabled in production", 403);
  const payment = await prisma.payment.findFirst({
    where: { reference, userId, provider: "MOCK", status: "PENDING" },
  });
  if (!payment) throw new PaymentError("Pending mock payment not found", 404);

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } });
  if (payment.purpose === "FEATURED_LISTING" && payment.propertyId) {
    await prisma.property.update({
      where: { id: payment.propertyId },
      data: { isFeatured: true, featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
  }
  return payment;
}

/** Price list for optional landlord extras (kobo). */
export const FEATURE_PRICES: Record<PaymentPurpose, number> = {
  FEATURED_LISTING: 500_000, // ₦5,000 for 30 days
  LISTING_PROMOTION: 200_000, // ₦2,000
  VERIFIED_LANDLORD_SERVICE: 1_000_000, // ₦10,000
  PREMIUM_TOOLS: 300_000, // ₦3,000 / month
};

/**
 * Starts a charge for an optional landlord extra.
 *
 * The price always comes from FEATURE_PRICES — never from the request body —
 * so a client cannot name its own amount. Listing-bound purposes require a
 * listing the caller actually owns; a non-owner gets a 404 rather than a 403
 * so private listings cannot be enumerated through this endpoint.
 */
export async function startCheckout(
  actor: { id: string; role: string },
  input: { purpose: PaymentPurpose; propertyId?: string },
) {
  let propertyId: string | undefined;

  if (LISTING_BOUND_PURPOSES.includes(input.purpose)) {
    if (!input.propertyId) throw new PaymentError("Choose which listing this applies to");
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, ownerId: true, title: true, status: true, deletedAt: true, isFeatured: true, featuredUntil: true },
    });
    if (!property || property.deletedAt || (property.ownerId !== actor.id && actor.role !== "ADMIN")) {
      throw new PaymentError("Listing not found", 404);
    }
    if (property.status !== "ACTIVE") {
      throw new PaymentError("Only a live listing can be featured or promoted");
    }
    if (property.isFeatured && property.featuredUntil && property.featuredUntil > new Date()) {
      throw new PaymentError(
        `"${property.title}" is already featured until ${property.featuredUntil.toISOString().slice(0, 10)}`,
      );
    }
    propertyId = property.id;
  }

  return initializeCharge({
    userId: actor.id,
    purpose: input.purpose,
    amountKobo: FEATURE_PRICES[input.purpose],
    propertyId,
    metadata: { requestedBy: actor.id },
  });
}

export async function listMyPayments(userId: string, page = 1, pageSize = 20) {
  const size = Math.min(Math.max(pageSize, 1), 50);
  const current = Math.max(page, 1);
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * size,
      take: size,
      include: { property: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.payment.count({ where }),
  ]);
  return { items, total, page: current, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) };
}
