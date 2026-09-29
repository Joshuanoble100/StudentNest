"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import type { NotificationType } from "@/lib/types";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationListProps {
  items: NotificationRow[];
  unreadCount: number;
}

/**
 * Notification feed. Marking as read is optimistic; a failure rolls the row
 * back so the badge never claims something the server did not record.
 */
export function NotificationList({ items, unreadCount }: NotificationListProps) {
  const router = useRouter();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const isRead = (item: NotificationRow) => item.read || readIds.has(item.id);

  async function markRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (!res.ok) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error();
      setReadIds(new Set(items.map((i) => i.id)));
      toast.success("All notifications marked as read");
      router.refresh();
    } catch {
      toast.error("Could not update notifications");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BellOff className="h-10 w-10" aria-hidden />}
        title="No notifications yet"
        description="You will be told here when a landlord replies to your inquiry, when a saved property changes price, and when a listing you reviewed gets a response."
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {unreadCount > 0 ? (
            <>
              <span className="font-semibold text-slate-900">{unreadCount}</span> unread
            </>
          ) : (
            "You are all caught up"
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAll}
          disabled={busy || unreadCount === 0}
        >
          <CheckCheck aria-hidden /> Mark all read
        </Button>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((item) => {
          const read = isRead(item);
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={read ? "neutral" : "default"}>
                      {NOTIFICATION_TYPE_LABELS[item.type] ?? item.type}
                    </Badge>
                    {!read && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                  </div>
                  <p className={cn("mt-1.5 text-sm", read ? "text-slate-600" : "font-semibold text-slate-900")}>
                    {item.title}
                  </p>
                  {item.body && <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>}
                </div>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-xs text-slate-400"
                >
                  {timeAgo(item.createdAt)}
                </time>
              </div>
            </>
          );

          return (
            <li key={item.id} className={cn(!read && "bg-brand-50/40")}>
              {item.link ? (
                <Link
                  href={item.link}
                  onClick={() => void markRead(item.id)}
                  className="block px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className="block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
