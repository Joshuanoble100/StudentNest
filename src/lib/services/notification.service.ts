import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email.service";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Maps notification types to the user's email preference toggle. */
const EMAIL_PREFERENCE_KEY: Partial<Record<NotificationType, "inquiryEmails" | "messageEmails" | "matchEmails" | "reviewEmails">> = {
  INQUIRY_NEW: "inquiryEmails",
  INQUIRY_RESPONSE: "inquiryEmails",
  MESSAGE_NEW: "messageEmails",
  ROOMMATE_MATCH: "matchEmails",
  NEW_MATCHING_PROPERTY: "matchEmails",
  REVIEW_RESPONSE: "reviewEmails",
  REVIEW_RECEIVED: "reviewEmails",
};

/**
 * Creates an in-app notification and optionally sends the matching email,
 * honoring the user's notification preferences. Email failures never
 * propagate (sendEmail swallows them).
 */
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });

  const pref = await prisma.notificationPreference.findUnique({
    where: { profileId: (await prisma.profile.findUnique({ where: { userId: input.userId }, select: { id: true } }))?.id ?? "" },
  });
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });

  const emailAllowed = pref ? pref.emailEnabled : true;
  const typeKey = EMAIL_PREFERENCE_KEY[input.type];
  const typeAllowed = typeKey && pref ? pref[typeKey] : true;

  if (user && emailAllowed && typeAllowed) {
    await sendEmail({
      to: user.email,
      subject: input.title,
      text: `${input.body ?? ""}\n\nOpen StudentNest to view: ${input.link ?? "/"}`,
      html: `<p>${escapeHtml(input.body ?? "")}</p>`,
    });
  }

  return notification;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function listNotifications(userId: string, page = 1, pageSize = 20) {
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { items, total, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
