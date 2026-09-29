import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ShieldAlert } from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { listConversations } from "@/lib/services/messaging.service";
import { PageHeader } from "@/components/account/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { ROLE_LABELS } from "@/lib/constants";
import { cn, initials, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUserPage("/messages");
  const conversations = await listConversations(user.id);

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Conversations with landlords, caretakers, agents and other students."
      />

      <Alert variant="info" className="mb-5">
        <ShieldAlert className="mr-1 inline h-4 w-4" aria-hidden />
        Keep the conversation here. StudentNest never asks for or shares phone numbers, and you
        should be cautious about anyone who pushes you to pay or continue the conversation off the
        platform. You can block a person and report a conversation at any time.
      </Alert>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-9 w-9" aria-hidden />}
          title="No conversations yet"
          description="Use “Message owner” on any listing, or “Message” on a roommate profile, to start a conversation."
          action={
            <Button asChild>
              <Link href="/properties">Browse listings</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {conversations.map((convo) => {
            const name = convo.other?.profile?.displayName || convo.other?.name || "Unknown user";
            const subjectLabel =
              convo.property?.title ??
              (convo.subject === "ROOMMATE" ? "Roommate search" : "General");

            return (
              <li key={convo.id}>
                <Link
                  href={`/messages/${convo.id}`}
                  className={cn(
                    "flex items-start gap-3 p-4 transition-colors hover:bg-slate-50",
                    convo.unread > 0 && "bg-brand-50/40",
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={convo.other?.profile?.avatarUrl ?? convo.other?.image ?? ""} alt="" />
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "truncate text-sm text-slate-900",
                          convo.unread > 0 && "font-semibold",
                        )}
                      >
                        {name}
                      </p>
                      {convo.other?.role && (
                        <Badge variant="neutral">{ROLE_LABELS[convo.other.role]}</Badge>
                      )}
                      {convo.blockedOther && <Badge variant="rejected">You blocked</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{subjectLabel}</p>
                    {convo.lastMessage && (
                      <p
                        className={cn(
                          "mt-1 line-clamp-2 text-sm",
                          convo.unread > 0 ? "text-slate-800" : "text-slate-500",
                        )}
                      >
                        {convo.lastMessage.senderId === user.id && (
                          <span className="text-slate-400">You: </span>
                        )}
                        {convo.lastMessage.body}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <time dateTime={convo.lastMessageAt.toISOString()} className="text-xs text-slate-400">
                      {timeAgo(convo.lastMessageAt)}
                    </time>
                    {convo.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">
                        {convo.unread > 99 ? "99+" : convo.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
