"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/ui/star-rating";

export interface EditableReview {
  id: string;
  title: string | null;
  body: string | null;
  overallRating: number;
}

/**
 * Inline editor for the author's own review.
 *
 * Only rating, title and body are editable. The verification level is decided
 * server-side from real records and can never be raised from here; edits set
 * `isEdited` so readers can see the review changed after publication.
 */
export function ReviewEditForm({ review, onDone }: { review: EditableReview; onDone: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(review.overallRating);
  const [title, setTitle] = useState(review.title ?? "");
  const [body, setBody] = useState(review.body ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      toast.error("Choose an overall rating");
      return;
    }
    if (body.trim().length < 30) {
      toast.error("Please write at least 30 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating: rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save your review");
        return;
      }
      toast.success("Review updated. It will be re-checked by moderation.");
      router.refresh();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <StarInput
        id={`edit-rating-${review.id}`}
        label="Overall rating"
        value={rating}
        onChange={setRating}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`edit-title-${review.id}`}>
          Title <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id={`edit-title-${review.id}`}
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-body-${review.id}`}>Your review</Label>
        <Textarea
          id={`edit-body-${review.id}`}
          rows={6}
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby={`edit-body-help-${review.id}`}
        />
        <p id={`edit-body-help-${review.id}`} className="text-xs text-slate-500">
          At least 30 characters. {body.trim().length}/4000
        </p>
      </div>
      <p className="text-xs text-slate-500">
        Editing sends your review back through moderation. Your verification label is unchanged — it
        is based on records we hold, not on what you type.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={busy}>
          <X aria-hidden /> Cancel
        </Button>
      </div>
    </form>
  );
}

/** One row of the "My reviews" list, with its honest moderation state. */
export function MyReviewItem({
  review,
}: {
  review: EditableReview & {
    status: string;
    statusLabel: string;
    verificationLabel: string;
    isEdited: boolean;
    moderationReason: string | null;
    createdAt: string;
    propertySlug: string;
    propertyTitle: string;
    response: string | null;
    canEdit: boolean;
  };
}) {
  const [editing, setEditing] = useState(false);

  const variant =
    review.status === "PUBLISHED"
      ? "verified"
      : review.status === "HIDDEN" || review.status === "REJECTED"
        ? "rejected"
        : "pending";

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/properties/${review.propertySlug}`}
            className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
          >
            {review.propertyTitle}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            {review.title || "Untitled review"} · {new Date(review.createdAt).toLocaleDateString("en-NG")}
            {review.isEdited && " · edited"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {review.statusLabel}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              variant === "verified"
                ? "bg-emerald-100 text-emerald-800"
                : variant === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {review.verificationLabel}
          </span>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{review.body}</p>

      {review.moderationReason && (
        <p className="mt-2 rounded-lg border-l-4 border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <strong className="font-semibold">Why this was moderated: </strong>
          {review.moderationReason}
          <span className="mt-1 block text-xs text-red-700">
            Your review was not deleted. Where moderation allows it you can edit and resubmit.
          </span>
        </p>
      )}

      {review.response && (
        <div className="mt-2 rounded-lg border-l-4 border-brand-600 bg-brand-50/60 p-3">
          <p className="text-xs font-semibold text-brand-800">Owner response</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.response}</p>
        </div>
      )}

      {review.canEdit && !editing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden /> Edit review
        </Button>
      )}

      {editing && <ReviewEditForm review={review} onDone={() => setEditing(false)} />}
    </li>
  );
}
