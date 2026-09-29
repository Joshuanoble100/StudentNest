import { NextResponse } from "next/server";
import { handleChargeSuccess, verifyWebhookSignature } from "@/lib/services/payments.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook — Paystack event receiver.
 *
 * The raw body is hashed for the signature check, so it must never be parsed
 * before verification. Only `charge.success` changes state, and payment status
 * is only ever flipped to SUCCESS after the provider re-confirms it
 * server-side. A forged or replayed event cannot grant a featured listing.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (rawBody.length > 64_000) {
      return NextResponse.json({ status: "payload_too_large" }, { status: 413 });
    }

    const signature = request.headers.get("x-paystack-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ status: "invalid_signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string; status?: string };
    };

    if (payload.event === "charge.success" && payload.data?.reference) {
      await handleChargeSuccess({
        event: payload.event,
        data: {
          reference: String(payload.data.reference).slice(0, 64),
          status: String(payload.data.status ?? ""),
        },
      });
    }

    // Always 200 for recognised events so Paystack does not retry indefinitely.
    return NextResponse.json({ status: "received" }, { status: 200 });
  } catch {
    // A malformed body is a bad request, not a server fault — and the error
    // text is never echoed back to an unauthenticated caller.
    return NextResponse.json({ status: "bad_request" }, { status: 400 });
  }
}
