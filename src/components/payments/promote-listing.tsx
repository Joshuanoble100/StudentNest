"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatNaira } from "@/lib/utils";

export type PurchasePurpose =
  | "FEATURED_LISTING"
  | "LISTING_PROMOTION"
  | "VERIFIED_LANDLORD_SERVICE"
  | "PREMIUM_TOOLS";

export interface PromotableListing {
  id: string;
  title: string;
  slug: string;
}

interface PromoteListingProps {
  listings: PromotableListing[];
  prices: Record<PurchasePurpose, number>;
  labels: Record<PurchasePurpose, string>;
  descriptions: Record<PurchasePurpose, string>;
  /** True when no payment provider is configured — charges are simulated. */
  mockMode: boolean;
}

const LISTING_BOUND: PurchasePurpose[] = ["FEATURED_LISTING", "LISTING_PROMOTION"];

/**
 * Buys an optional landlord extra.
 *
 * Prices are rendered from the server-supplied map and the server re-prices the
 * charge from the same table, so what is shown is always what is charged.
 */
export function PromoteListing({
  listings,
  prices,
  labels,
  descriptions,
  mockMode,
}: PromoteListingProps) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PurchasePurpose>("FEATURED_LISTING");
  const [propertyId, setPropertyId] = useState("");
  const [pending, startTransition] = useTransition();
  const [mockReference, setMockReference] = useState<string | null>(null);

  const needsListing = LISTING_BOUND.includes(purpose);

  function buy() {
    if (needsListing && !propertyId) {
      toast.error("Choose which listing this applies to");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, ...(needsListing ? { propertyId } : {}) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "The payment could not be started");
        return;
      }
      const charge = json.data as { reference: string; authorizationUrl: string | null; provider: string };
      if (charge.authorizationUrl) {
        toast.success("Redirecting to Paystack…");
        window.location.assign(charge.authorizationUrl);
        return;
      }
      setMockReference(charge.reference);
      toast.info("Mock charge created — complete it below to simulate a successful payment");
    });
  }

  function completeMock() {
    if (!mockReference) return;
    startTransition(async () => {
      const res = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: mockReference }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "The mock payment could not be completed");
        return;
      }
      setMockReference(null);
      toast.success("Mock payment recorded");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">What do you want to buy?</legend>
        {(Object.keys(prices) as PurchasePurpose[]).map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              purpose === option
                ? "border-brand-600 bg-brand-50/60"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              type="radio"
              name="purpose"
              value={option}
              checked={purpose === option}
              onChange={() => {
                setPurpose(option);
                setMockReference(null);
              }}
              className="mt-1 h-4 w-4 accent-emerald-700"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {option === "FEATURED_LISTING" && (
                    <Sparkles className="mr-1 inline h-3.5 w-3.5 text-amber-500" aria-hidden />
                  )}
                  {labels[option] ?? option.replace(/_/g, " ")}
                </span>
                <span className="tabular-nums text-sm font-semibold text-slate-900">
                  {formatNaira(prices[option] / 100)}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">{descriptions[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {needsListing && (
        <div className="space-y-1.5">
          <Label htmlFor="promote-listing">Listing</Label>
          {listings.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You have no live listing to promote. A listing has to be approved and visible to
              students before it can be featured — promoting a rejected or draft listing would show
              students something we have not checked.
            </p>
          ) : (
            <Select
              value={propertyId}
              onValueChange={(value) => {
                setPropertyId(value);
                setMockReference(null);
              }}
            >
              <SelectTrigger id="promote-listing">
                <SelectValue placeholder="Choose a live listing" />
              </SelectTrigger>
              <SelectContent>
                {listings.map((listing) => (
                  <SelectItem key={listing.id} value={listing.id}>
                    {listing.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={buy}
          disabled={pending || (needsListing && listings.length === 0)}
        >
          {pending ? "Working…" : `Pay ${formatNaira(prices[purpose] / 100)}`}
        </Button>
        <p className="text-xs text-slate-500">
          {mockMode
            ? "No payment provider is configured, so this creates a simulated charge."
            : "You will be redirected to Paystack. We only mark it paid after Paystack confirms it."}
        </p>
      </div>

      {mockReference && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-700">
            Mock charge <code className="text-xs">{mockReference}</code> is pending.
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={completeMock} disabled={pending}>
            {pending ? "Working…" : "Simulate successful payment"}
          </Button>
        </div>
      )}
    </div>
  );
}
