"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  propertyId: string;
  initial?: boolean;
  className?: string;
}

/**
 * Heart button toggling the favorite state via POST /api/favorites.
 * Guests are sent through login first.
 */
export function FavoriteButton({ propertyId, initial = false, className }: FavoriteButtonProps) {
  const router = useRouter();
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    if (status !== "authenticated") {
      toast.info("Log in to save properties");
      signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not update favorite");
        return;
      }
      setFavorited(json.data.favorited);
      toast.success(json.data.favorited ? "Saved to favorites" : "Removed from favorites");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      aria-pressed={favorited}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-60",
        className,
      )}
    >
      <Heart
        className={cn("h-5 w-5", favorited ? "fill-red-500 text-red-500" : "text-slate-500")}
        aria-hidden
      />
    </button>
  );
}
