import type { Metadata } from "next";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isProviderLive } from "@/lib/env";
import { FEATURE_PRICES, listMyPayments } from "@/lib/services/payments.service";
import { PageHeader } from "@/components/account/page-header";
import { PromoteListing, type PurchasePurpose } from "@/components/payments/promote-listing";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { PAYMENT_PURPOSE_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Billing · Landlord dashboard", robots: { index: false } };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const PURPOSE_LABELS: Record<PurchasePurpose, string> = {
  FEATURED_LISTING: "Featured placement (30 days)",
  LISTING_PROMOTION: "Listing promotion (7 days)",
  VERIFIED_LANDLORD_SERVICE: "Assisted verification check",
  PREMIUM_TOOLS: "Premium tools (monthly)",
};

const PURPOSE_DESCRIPTIONS: Record<PurchasePurpose, string> = {
  FEATURED_LISTING:
    "Featured placement — your listing appears above organic results for 30 days and is labelled “Featured · paid placement” so students know it was bought.",
  LISTING_PROMOTION:
    "Listing promotion — a shorter boost for a listing you have just added or just reduced in price.",
  VERIFIED_LANDLORD_SERVICE:
    "Assisted verification check — our team calls you, collects your evidence and reviews your verification request within 3 working days. This does not guarantee approval; a badge is only issued when the evidence checks out.",
  PREMIUM_TOOLS:
    "Premium tools — bulk editing, export of your own inquiry data, and monthly performance summaries for your listings.",
};

const STATUS_VARIANT: Record<string, "verified" | "pending" | "rejected" | "neutral"> = {
  SUCCESS: "verified",
  PENDING: "pending",
  FAILED: "rejected",
  REFUNDED: "neutral",
};

export default async function LandlordBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; page?: string }>;
}) {
  const user = await requireRolePage(...PROVIDER_ROLES);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const reference = /^[A-Za-z0-9_-]{6,64}$/.test(params.reference ?? "") ? (params.reference as string) : null;

  const [payments, listings, returning] = await Promise.all([
    listMyPayments(user.id, page),
    prisma.property.findMany({
      where: { ownerId: user.id, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, isFeatured: true, featuredUntil: true },
    }),
    reference
      ? prisma.payment.findFirst({
          where: { reference, userId: user.id },
          select: { reference: true, status: true, purpose: true, amountKobo: true },
        })
      : Promise.resolve(null),
  ]);

  const promotable = listings.filter(
    (listing) => !listing.isFeatured || !listing.featuredUntil || listing.featuredUntil <= new Date(),
  );

  const hrefFor = (next: number) =>
    next > 1 ? `/dashboard/landlord/billing?page=${next}` : "/dashboard/landlord/billing";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Optional extras for your listings. Nothing a student needs — searching, viewing, reviewing or messaging — is ever behind a payment."
      />

      {returning && (
        <Alert variant={returning.status === "SUCCESS" ? "success" : returning.status === "PENDING" ? "info" : "warning"}>
          <AlertTitle>
            {returning.status === "SUCCESS"
              ? "Payment confirmed"
              : returning.status === "PENDING"
                ? "Still waiting on confirmation"
                : "Payment not completed"}
          </AlertTitle>
          <p className="text-sm">
            {PAYMENT_PURPOSE_LABELS[returning.purpose]} · {formatNaira(returning.amountKobo / 100)} ·{" "}
            {PAYMENT_STATUS_LABELS[returning.status]}.{" "}
            {returning.status === "PENDING" &&
              "We only mark a charge as paid once the provider confirms it server-side, so this can lag a few seconds behind the redirect."}
          </p>
        </Alert>
      )}

      {!isProviderLive("payments") && (
        <Alert variant="info">
          <AlertTitle>Payments are running in mock mode</AlertTitle>
          No live Paystack key is configured, so charges are simulated and recorded with{" "}
          <code className="text-xs">provider = MOCK</code>. Set{" "}
          <code className="text-xs">PAYMENT_PROVIDER=paystack</code> and{" "}
          <code className="text-xs">PAYSTACK_SECRET_KEY</code> to take real money.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Buy an extra</CardTitle>
            <CardDescription>
              You are charged only after the payment provider confirms it. Featured placements are
              always labelled as paid to students — buying visibility never buys a better review
              score or a verification badge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromoteListing
              listings={promotable.map((listing) => ({
                id: listing.id,
                title: listing.title,
                slug: listing.slug,
              }))}
              prices={FEATURE_PRICES as Record<PurchasePurpose, number>}
              labels={PURPOSE_LABELS}
              descriptions={PURPOSE_DESCRIPTIONS}
              mockMode={!isProviderLive("payments")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you cannot buy</CardTitle>
            <CardDescription>So there is no ambiguity about what a payment does.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <span className="font-medium">A verification badge.</span> That is issued by our
                moderation team against evidence, never sold.
              </li>
              <li>
                <span className="font-medium">A higher review score.</span> Ratings come from
                students who stayed, and owners cannot delete or edit them.
              </li>
              <li>
                <span className="font-medium">Removal of a negative review.</span> You can publish a
                response, and you can report a review you believe is fake — a moderator decides.
              </li>
              <li>
                <span className="font-medium">Skipping listing review.</span> Paid listings still go
                through the same approval checks as every other listing.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>{payments.total} charge{payments.total === 1 ? "" : "s"} on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.items.length === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Anything you buy will be listed here with its reference and status."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.items.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {PAYMENT_PURPOSE_LABELS[payment.purpose]}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {formatDate(payment.createdAt)} ·{" "}
                      <code className="text-[11px]">{payment.reference}</code>
                      {payment.provider === "MOCK" && " · simulated"}
                      {payment.property && (
                        <>
                          {" · "}
                          <Link href={`/properties/${payment.property.slug}`} className="text-brand-700 hover:underline">
                            {payment.property.title}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatNaira(payment.amountKobo / 100)}
                    </span>
                    <Badge variant={STATUS_VARIANT[payment.status] ?? "neutral"}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Pagination page={payments.page} totalPages={payments.totalPages} hrefFor={hrefFor} />

      {promotable.length === 0 && listings.length > 0 && (
        <p className="text-sm text-slate-600">
          All your live listings are currently featured. Promotions become available again when an
          existing placement expires.
        </p>
      )}
    </div>
  );
}
