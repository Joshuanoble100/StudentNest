"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { BookmarkPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Saves the current URL search state as a reusable search. */
export function SaveSearchButton() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const query = Object.fromEntries(new URLSearchParams(searchParams.toString()).entries());
  const hasFilters = Object.keys(query).filter((k) => k !== "page" && k !== "view").length > 0;

  async function save() {
    if (!name.trim()) {
      toast.error("Give this search a name");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), query }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save search");
        return;
      }
      toast.success("Search saved — we'll notify you when new listings match.");
      setOpen(false);
      setName("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return setOpen(false);
        if (status !== "authenticated") {
          toast.info("Log in to save searches");
          signIn(undefined, { callbackUrl: window.location.href });
          return;
        }
        setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" disabled={!hasFilters}>
          <BookmarkPlus className="mr-1.5 h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Save search</span>
          <span className="sm:hidden">Save</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>
            You&apos;ll see it in your dashboard and get notified when new listings match these
            filters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="saved-search-name">Name</Label>
          <Input
            id="saved-search-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Self-contain near UNN under ₦200k"
            maxLength={80}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
