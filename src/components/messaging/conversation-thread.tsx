"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, Send, ShieldAlert, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReportDialog } from "@/components/report/report-dialog";
import { cn, formatDateTime, initials, timeAgo } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface ThreadOther {
  id: string;
  name: string;
  role: string;
  image: string | null;
  avatarUrl: string | null;
  displayName: string | null;
}

interface ConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  other: ThreadOther | null;
  subjectLabel: string;
  propertySlug: string | null;
  initialMessages: ThreadMessage[];
  initiallyBlocked: boolean;
}

const POLL_MS = 20_000;

/**
 * A single message thread.
 *
 * Phone numbers are never exchanged here and the UI says so. Blocking is local
 * to the thread and reversible; reporting goes to admins with an audit trail.
 */
export function ConversationThread({
  conversationId,
  currentUserId,
  other,
  subjectLabel,
  propertySlug,
  initialMessages,
  initiallyBlocked,
}: ConversationThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [blocking, setBlocking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(scrollToBottom, [messages.length, scrollToBottom]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: { messages: { id: string; body: string; senderId: string; createdAt: string }[] };
      };
      setMessages(json.data.messages ?? []);
    } catch {
      // Polling failures are non-fatal; the next tick will retry.
    }
  }, [conversationId]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function submitMessage() {
    const body = draft.trim();
    if (!body || sending || blocked) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Message not sent");
        return;
      }
      setDraft("");
      await refresh();
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    void submitMessage();
  }

  async function toggleBlock() {
    setBlocking(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !blocked }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not update the block");
        return;
      }
      setBlocked(!blocked);
      toast.success(blocked ? "Unblocked" : "Blocked — they can no longer message you here");
      router.refresh();
    } finally {
      setBlocking(false);
    }
  }

  const otherName = other?.displayName || other?.name || "Unknown user";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={other?.avatarUrl ?? other?.image ?? ""} alt="" />
            <AvatarFallback>{initials(otherName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{otherName}</p>
            {propertySlug ? (
              <Link
                href={`/properties/${propertySlug}`}
                className="block truncate text-xs text-brand-700 hover:underline"
              >
                {subjectLabel}
              </Link>
            ) : (
              <p className="truncate text-xs text-slate-500">{subjectLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ReportDialog
            targetType="CONVERSATION"
            targetId={conversationId}
            label="Report"
            variant="outline"
          />
          <Button
            type="button"
            variant={blocked ? "outline" : "ghost"}
            size="sm"
            onClick={() => void toggleBlock()}
            disabled={blocking}
          >
            {blocked ? <Undo2 aria-hidden /> : <Ban aria-hidden />}
            {blocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </header>

      <div className="my-3 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No messages yet. Say hello — but never share your phone number or send money before
            inspecting a property in person.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]",
                    mine
                      ? "rounded-br-sm bg-brand-700 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-900",
                  )}
                >
                  <p className="whitespace-pre-line break-words text-sm">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      mine ? "text-brand-100" : "text-slate-500",
                    )}
                  >
                    {timeAgo(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {blocked && (
        <Alert variant="warning" className="mb-3">
          You blocked this person. They cannot send you new messages in this thread until you
          unblock them.
        </Alert>
      )}

      <form onSubmit={send} className="space-y-2">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitMessage();
              }
            }}
            rows={2}
            maxLength={2000}
            disabled={blocked || sending}
            placeholder={
              blocked ? "Unblock to send a message" : "Write a message… (Enter to send)"
            }
            aria-label="Message"
            className="flex-1 resize-none"
          />
          <Button type="submit" disabled={blocked || sending || draft.trim().length === 0}>
            <Send aria-hidden /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Messages stay inside StudentNest. Do not share your phone number, and never pay before
          inspecting a property.{" "}
          <span className="text-slate-400">
            {messages.length > 0 && `Last message ${formatDateTime(messages[messages.length - 1]!.createdAt)}`}
          </span>
        </p>
      </form>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant="neutral">{messages.length} messages</Badge>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
