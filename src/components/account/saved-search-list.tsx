"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BookmarkX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SavedSearchRow {
  id: string;
  name: string;
  query: Record<string, string>;
  createdAt: string;
}

/** Saved filter queries. Deleting is optimistic and rolls back on failure. */
export function SavedSearchList({ items }: { items: SavedSearchRow[] }) {
  const router = useRouter();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = items.filter((item) => !removed.has(item.id));

  async function remove(id: string) {
    setBusyId(id);
    setRemoved((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Saved search removed");
      router.refresh();
    } catch {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Could not remove that saved search");
    } finally {
      setBusyId(null);
    }
  }

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        <BookmarkX className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden />
        No saved searches yet. Apply filters on the search page, then choose
        &ldquo;Save this search&rdquo; to get notified when something new matches.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {visible.map((item) => {
        const href = `/properties?${new URLSearchParams(item.query).toString()}`;
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <Link
                href={href}
                className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
              >
                {item.name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {Object.entries(item.query)
                  .filter(([key]) => key !== "page" && key !== "name")
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ") || "No filters"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={href}>
                  <Search aria-hidden /> Run
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void remove(item.id)}
                disabled={busyId === item.id}
                aria-label={`Remove saved search ${item.name}`}
              >
                Remove
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
