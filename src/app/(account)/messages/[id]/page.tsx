import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { getConversation, MessagingError } from "@/lib/services/messaging.service";
import { ConversationThread } from "@/components/messaging/conversation-thread";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage("/messages");
  const { id } = await params;

  let data;
  try {
    data = await getConversation(user.id, id);
  } catch (error) {
    // Not a participant, or the thread no longer exists — both look the same
    // from the outside so we never confirm which conversations exist.
    if (error instanceof MessagingError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const { conversation, messages, other, me } = data;
  const subjectLabel = conversation.property?.title ?? (conversation.subject === "ROOMMATE" ? "Roommate search" : "General");

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[32rem] flex-col">
      <Link
        href="/messages"
        className="mb-3 inline-flex items-center gap-1 self-start text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> All messages
      </Link>

      <ConversationThread
        conversationId={conversation.id}
        currentUserId={user.id}
        other={
          other
            ? {
                id: other.id,
                name: other.name,
                role: other.role,
                image: other.image,
                avatarUrl: other.profile?.avatarUrl ?? null,
                displayName: other.profile?.displayName ?? null,
              }
            : null
        }
        subjectLabel={subjectLabel}
        propertySlug={conversation.property?.slug ?? null}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt.toISOString(),
        }))}
        initiallyBlocked={me?.blockedOther ?? false}
      />
    </div>
  );
}
