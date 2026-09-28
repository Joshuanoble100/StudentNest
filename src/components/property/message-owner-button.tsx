"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageOwnerButtonProps {
  ownerId: string;
  ownerName: string;
  propertyId: string;
  propertyTitle: string;
}

/**
 * Starts (or resumes) an on-platform conversation with the listing owner.
 * Phone numbers are never exchanged — messaging stays inside StudentNest.
 */
export function MessageOwnerButton({
  ownerId,
  ownerName,
  propertyId,
  propertyTitle,
}: MessageOwnerButtonProps) {
  const router = useRouter();
  const { status } = useSession();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (status !== "authenticated") {
      toast.info("Log in to message this owner");
      signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: ownerId,
          propertyId,
          subject: `PROPERTY:${propertyId}`,
          firstMessage: `Hello ${ownerName}, I'm interested in "${propertyTitle}". Is it still available?`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not start conversation");
        return;
      }
      router.push(`/dashboard/messages/${json.data.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={start} disabled={busy}>
      <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
      {busy ? "Opening chat…" : `Message ${ownerName.split(" ")[0]}`}
    </Button>
  );
}

/** Fallback shown to signed-out visitors. */
export function MessageOwnerLoginLink({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" className="w-full">
      <Link href={href}>
        <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
        Log in to message
      </Link>
    </Button>
  );
}
