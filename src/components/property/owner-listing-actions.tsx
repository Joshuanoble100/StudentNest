"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OwnerListingActionsProps {
  propertyId: string;
  slug: string;
  status: string;
}

/**
 * Owner-only controls for one listing.
 *
 * "Submit for review" is the only path to publishing — there is no client-side
 * way to set a listing ACTIVE, and the API rejects that status from owners.
 */
export function OwnerListingActions({ propertyId, slug, status }: OwnerListingActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function patch(body: Record<string, unknown>, successMessage: string) {
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(json?.error?.message ?? "That change could not be saved");
      return false;
    }
    toast.success(successMessage);
    startTransition(() => router.refresh());
    return true;
  }

  async function remove() {
    const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete this listing");
      return;
    }
    setConfirmOpen(false);
    toast.success("Listing deleted");
    startTransition(() => router.refresh());
  }

  const canSubmit = status === "DRAFT" || status === "REJECTED" || status === "RENTED_OUT";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => patch({ status: "RENTED_OUT" }, "Marked as rented out — hidden from search")}
        >
          <CheckCircle2 aria-hidden /> Mark rented out
        </Button>
      )}

      {canSubmit && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            patch(
              { status: "PENDING_REVIEW" },
              "Sent for review. It stays offline until an admin approves it.",
            )
          }
        >
          <Send aria-hidden /> Submit for review
        </Button>
      )}

      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/landlord/properties/${propertyId}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>

      {status === "ACTIVE" && (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/properties/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden /> View
          </Link>
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
            <Trash2 aria-hidden /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              It will be removed from search immediately. Reviews students already wrote stay
              on record — deleting a listing does not delete its review history. You can ask
              support to restore it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep listing
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              Delete listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
