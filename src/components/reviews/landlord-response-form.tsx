"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface LandlordResponseFormProps {
  reviewId: string;
  initialBody: string;
}

/**
 * Owner response to a review. Owners can publish and update a response, but
 * never delete or edit the review itself.
 */
export function LandlordResponseForm({ reviewId, initialBody }: LandlordResponseFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initialBody);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (body.trim().length < 5) {
      toast.error("Write at least 5 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save response");
        return;
      }
      toast.success("Response published");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Edit response
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor={`response-${reviewId}`} className="text-xs text-slate-500">
        Your public response
      </Label>
      <Textarea
        id={`response-${reviewId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Respond politely and factually. This is public and cannot be used to attack the reviewer."
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : initialBody ? "Update response" : "Publish response"}
        </Button>
        {initialBody && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
