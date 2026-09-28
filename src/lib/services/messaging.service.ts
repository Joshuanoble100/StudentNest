import { prisma } from "@/lib/prisma";
import { createNotification } from "./notification.service";

export class MessagingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function participantKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

async function publicUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      image: true,
      profile: { select: { avatarUrl: true, displayName: true } },
    },
  });
}

export async function getOrCreateConversation(
  senderId: string,
  recipientId: string,
  opts: { propertyId?: string; subject?: string; firstMessage?: string } = {},
) {
  if (senderId === recipientId) throw new MessagingError("You cannot message yourself");

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!recipient || recipient.status !== "ACTIVE" || recipient.deletedAt) {
    throw new MessagingError("Recipient not found", 404);
  }

  const subject = opts.subject ?? "GENERAL";
  const key = participantKey(senderId, recipientId);

  let conversation = await prisma.conversation.findFirst({
    where: { participantKey: key, subject },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participantKey: key,
        subject,
        propertyId: opts.propertyId ?? null,
        userAId: key.split(":")[0]!,
        userBId: key.split(":")[1]!,
        participants: {
          create: [{ userId: senderId }, { userId: recipientId }],
        },
      },
    });
  }

  if (opts.firstMessage) {
    await sendMessage(senderId, conversation.id, opts.firstMessage);
  }
  return conversation;
}

/**
 * Sends a message. Blocked participants cannot message each other.
 * Rate limiting is enforced by the calling route via assertRateLimit.
 */
export async function sendMessage(senderId: string, conversationId: string, body: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true, property: { select: { slug: true, title: true } } },
  });
  if (!conversation) throw new MessagingError("Conversation not found", 404);

  const sender = conversation.participants.find((p) => p.userId === senderId);
  if (!sender) throw new MessagingError("Not a participant", 403);

  const other = conversation.participants.find((p) => p.userId !== senderId);
  if (!other) throw new MessagingError("Conversation is broken", 500);
  if (other.blockedOther) {
    throw new MessagingError("This user is not accepting your messages", 403);
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId, senderId, body },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    return created;
  });

  await createNotification({
    userId: other.userId,
    type: "MESSAGE_NEW",
    title: "New message",
    body: body.slice(0, 120),
    link: `/messages/${conversationId}`,
  });

  return message;
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId, hidden: false } },
    },
    include: {
      property: {
        select: { id: true, slug: true, title: true, images: { where: { isCover: true }, take: 1, select: { url: true, thumbUrl: true } } },
      },
      participants: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  // Batch-fetch counterpart users (avoids N+1).
  const otherIds = [
    ...new Set(
      conversations.map(
        (c) => c.participants.find((p) => p.userId !== userId)?.userId,
      ).filter((id): id is string => Boolean(id)),
    ),
  ];
  const others = otherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: {
          id: true,
          name: true,
          role: true,
          image: true,
          profile: { select: { avatarUrl: true, displayName: true } },
        },
      })
    : [];
  const otherById = new Map(others.map((u) => [u.id, u]));

  // Batch unread counts: one grouped query honoring each conversation's lastReadAt.
  const convoIds = conversations.map((c) => c.id);
  const readByConvo = new Map(
    conversations.map((c) => [c.id, c.participants.find((p) => p.userId === userId)?.lastReadAt ?? null]),
  );
  const unreadGroups = convoIds.length
    ? await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          conversationId: { in: convoIds },
          senderId: { not: userId },
          deletedAt: null,
          OR: convoIds.map((id) => {
            const lastRead = readByConvo.get(id);
            return lastRead
              ? { conversationId: id, createdAt: { gt: lastRead } }
              : { conversationId: id };
          }),
        },
        _count: { _all: true },
      })
    : [];
  const unreadByConvo = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]));

  return conversations.map((convo) => {
    const otherId = convo.participants.find((p) => p.userId !== userId)?.userId;
    const me = convo.participants.find((p) => p.userId === userId);
    return {
      id: convo.id,
      subject: convo.subject,
      property: convo.property,
      other: (otherId && otherById.get(otherId)) || null,
      lastMessage: convo.messages[0] ?? null,
      unread: unreadByConvo.get(convo.id) ?? 0,
      blockedOther: me?.blockedOther ?? false,
      lastMessageAt: convo.lastMessageAt,
    };
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: true,
      property: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!conversation) throw new MessagingError("Conversation not found", 404);
  if (!conversation.participants.some((p) => p.userId === userId)) {
    throw new MessagingError("Not a participant", 403);
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  // Mark as read.
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });

  const otherId = conversation.participants.find((p) => p.userId !== userId)?.userId;
  const other = otherId ? await publicUser(otherId) : null;

  return { conversation, messages, other, me: conversation.participants.find((p) => p.userId === userId) };
}

export async function setBlocked(userId: string, conversationId: string, blocked: boolean) {
  const updated = await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { blockedOther: blocked },
  });
  if (updated.count === 0) throw new MessagingError("Not a participant", 403);
  return { blocked };
}

export async function unreadMessageCount(userId: string): Promise<number> {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (participants.length === 0) return 0;
  return prisma.message.count({
    where: {
      deletedAt: null,
      senderId: { not: userId },
      OR: participants.map((p) => ({
        conversationId: p.conversationId,
        ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
      })),
    },
  });
}
