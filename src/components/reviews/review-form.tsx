"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/ui/star-rating";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REVIEW_CATEGORY_LABELS } from "@/lib/constants";
import type { ReviewCategory } from "@/lib/types";

interface ReviewFormProps {
  propertyId: string;
  /** Inquiries this student already had with the owner — used for verification. */
  inquiries: { id: string; label: string }[];
}

const CATEGORIES = Object.keys(REVIEW_CATEGORY_LABELS) as ReviewCategory[];

/**
 * Student review form.
 *
 * The verification badge shown on the published review is decided server-side
 * from real records (admin-confirmed stay, or a responded inquiry/viewing).
 * Nothing in this form can claim a higher verification level.
 */
export function ReviewForm({ propertyId, inquiries }: ReviewFormProps) {
  const router = useRouter();
  const [overall, setOverall] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categories, setCategories] = useState<Partial<Record<ReviewCategory, number>>>({});
  const [stayFrom, setStayFrom] = useState("");
  const [stayTo, setStayTo] = useState("");
  const [months, setMonths] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (overall < 1) {
      toast.error("Choose an overall rating");
      return;
    }
    if (body.trim().length < 30) {
      toast.error("Please write at least 30 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          overallRating: overall,
          title: title.trim() || undefined,
          body: body.trim(),
          categoryRatings: Object.entries(categories)
            .filter(([, rating]) => typeof rating === "number" && rating > 0)
            .map(([category, rating]) => ({ category, rating })),
          dateStayedFrom: stayFrom || null,
          dateStayedTo: stayTo || null,
          stayDurationMonths: months ? Number(months) : null,
          inquiryId: inquiryId || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not publish review");
        return;
      }
      toast.success(
        json?.data?.status === "PUBLISHED"
          ? "Review published. Thank you for helping other students."
          : "Review submitted. Because we could not confirm your stay, a moderator will check it before it appears.",
      );
      router.refresh();
      setOverall(0);
      setTitle("");
      setBody("");
      setCategories({});
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Reviews are labelled <strong>Verified stay</strong> (confirmed by our team),{" "}
            <strong>Verified reviewer</strong> (you had a confirmed interaction with the owner) or{" "}
            <strong>Unverified</strong>. Verified reviews publish immediately; unverified ones are
            checked by a moderator first. Owners can respond publicly but can never delete your
            review.
          </span>
        </p>
      </div>

      <StarInput value={overall} onChange={setOverall} label="Overall rating" id="review-overall" />

      <div className="space-y-1.5">
        <Label htmlFor="review-title">Headline (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Quiet self-contain, but water is rationed"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-body">Your experience</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="What was living there actually like? Cover electricity, water, security, the landlord or caretaker, and anything you wish you had known."
        />
        <p className="text-xs text-slate-500">
          {body.trim().length}/4000 · minimum 30 characters
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Rate by category (optional)</legend>
        <p className="mb-2 text-xs text-slate-500">
          Category ratings help students compare specific living conditions, not just a single
          number.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <span className="text-xs text-slate-600">{REVIEW_CATEGORY_LABELS[category]}</span>
              <StarInput
                value={categories[category] ?? 0}
                onChange={(value) => setCategories((prev) => ({ ...prev, [category]: value }))}
                label={REVIEW_CATEGORY_LABELS[category]}
                id={`review-cat-${category}`}
                size="sm"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="review-stay-from">Stayed from</Label>
          <Input
            id="review-stay-from"
            type="date"
            value={stayFrom}
            onChange={(e) => setStayFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-stay-to">Stayed to</Label>
          <Input
            id="review-stay-to"
            type="date"
            value={stayTo}
            min={stayFrom || undefined}
            onChange={(e) => setStayTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-months">Months stayed</Label>
          <Input
            id="review-months"
            type="number"
            min={1}
            max={240}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            placeholder="e.g. 10"
          />
        </div>
      </div>

      {inquiries.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="review-inquiry">Link an inquiry (helps verification)</Label>
          <Select value={inquiryId || undefined} onValueChange={setInquiryId}>
            <SelectTrigger id="review-inquiry">
              <SelectValue placeholder="Select one of your inquiries" />
            </SelectTrigger>
            <SelectContent>
              {inquiries.map((inquiry) => (
                <SelectItem key={inquiry.id} value={inquiry.id}>
                  {inquiry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Only inquiries you actually sent are listed. Linking one may label your review
            &ldquo;Verified reviewer&rdquo;.
          </p>
        </div>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? "Publishing…" : "Publish review"}
      </Button>
    </form>
  );
}
