"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies the listing URL. Falls back to the Web Share API on mobile. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const absolute = new URL(url, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch {
        // User dismissed the share sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Your browser may block clipboard access.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={share}>
      {copied ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : <Share2 className="mr-1.5 h-4 w-4" aria-hidden />}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
