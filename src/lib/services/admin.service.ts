import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { auditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export class AdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function moderateUser(
  admin: { id: string; email: string },
  userId: string,
  action: "SUSPEND" | "REACTIVATE" | "PROMOTE_ADMIN" | "DEMOTE_ADMIN" | "DELETE",
  reason?: string,
) {
  if (admin.id === userId && action !== "REACTIVATE") {
    throw new AdminError("You cannot perform this action on your own account", 403);
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!user) throw new AdminError("User not found", 404);

  switch (action) {
    case "SUSPEND":
      await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
      await prisma.property.updateMany({
        where: { ownerId: userId, status: { in: ["ACTIVE", "PENDING_REVIEW"] }, deletedAt: null },
        data: { status: "SUSPENDED" },
      });
      await createNotification({
        userId,
        type: "ACCOUNT_ALERT",
        title: "Account suspended",
        body: reason ?? "Your account has been suspended. Contact support if you believe this is an error.",
      });
      break;
    case "REACTIVATE":
      await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
      break;
    case "PROMOTE_ADMIN":
      await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
      break;
    case "DEMOTE_ADMIN":
      if (user.role !== "ADMIN") throw new AdminError("User is not an admin");
      await prisma.user.update({ where: { id: userId }, data: { role: "LANDLORD" } });
      break;
    case "DELETE":
      await prisma.user.update({
        where: { id: userId },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      await prisma.property.updateMany({
        where: { ownerId: userId, deletedAt: null },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      break;
  }

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `user.${action.toLowerCase()}`,
    entityType: "User",
    entityId: userId,
    metadata: { reason: reason ?? null, previousRole: user.role, previousStatus: user.status },
  });
}

export async function getDashboardStats() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, students, landlords, agents, admins,
    activeListings, pendingListings, verifiedProperties,
    reportedProperties, reportedReviews, openReports,
    newInquiries24h, newUsers24h, newUsers30d,
    totalReviews, publishedReviews, totalMessages,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "LANDLORD", deletedAt: null } }),
    prisma.user.count({ where: { role: "AGENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
    prisma.property.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.property.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
    prisma.property.count({ where: { verificationStatus: "VERIFIED", deletedAt: null } }),
    prisma.report.count({ where: { targetType: "PROPERTY", status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.reviewReport.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.inquiry.count({ where: { createdAt: { gte: since24h } } }),
    prisma.user.count({ where: { createdAt: { gte: since24h } } }),
    prisma.user.count({ where: { createdAt: { gte: since30d } } }),
    prisma.review.count(),
    prisma.review.count({ where: { status: "PUBLISHED" } }),
    prisma.message.count(),
  ]);

  return {
    totalUsers, students, landlords, agents, admins,
    activeListings, pendingListings, verifiedProperties,
    reportedProperties, reportedReviews, openReports,
    newInquiries24h, newUsers24h, newUsers30d,
    totalReviews, publishedReviews, totalMessages,
  };
}

/** Daily registrations for the last N days (analytics page). */
export async function dailyRegistrations(days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const u of users) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}

export async function listUsers(
  filters: { q?: string; role?: string; status?: string; page?: number; pageSize?: number } = {},
) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const where = {
    deletedAt: null,
    ...(filters.role ? { role: filters.role as never } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true,
        emailVerified: true, createdAt: true,
        _count: { select: { ownedProperties: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

// -- Universities / campuses / neighborhoods management -------------------

export async function createUniversity(
  admin: { id: string; email: string },
  input: { name: string; shortName: string; slug?: string; city: string; state: string; country?: string },
) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.shortName);
  const university = await prisma.university.create({
    data: { ...input, slug, country: input.country ?? "Nigeria", isDemoData: false },
  });
  await auditLog({ actorId: admin.id, actorEmail: admin.email, action: "university.create", entityType: "University", entityId: university.id });
  return university;
}

export async function createCampus(
  admin: { id: string; email: string },
  input: { universityId: string; name: string; slug?: string; city?: string; latitude?: number | null; longitude?: number | null },
) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const campus = await prisma.campus.create({
    data: {
      universityId: input.universityId,
      name: input.name,
      slug,
      city: input.city ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      isDemoData: false,
    },
  });
  await auditLog({ actorId: admin.id, actorEmail: admin.email, action: "campus.create", entityType: "Campus", entityId: campus.id });
  return campus;
}

export async function createNeighborhood(
  admin: { id: string; email: string },
  input: { name: string; slug?: string; city: string; state: string; latitude?: number | null; longitude?: number | null },
) {
  const slug = input.slug ? slugify(input.slug) : slugify(`${input.name}-${input.city}`);
  const neighborhood = await prisma.neighborhood.create({
    data: {
      name: input.name,
      slug,
      city: input.city,
      state: input.state,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      isDemoData: false,
    },
  });
  await auditLog({ actorId: admin.id, actorEmail: admin.email, action: "neighborhood.create", entityType: "Neighborhood", entityId: neighborhood.id });
  return neighborhood;
}

export async function listAuditLogs(page = 1, pageSize = 30, action?: string) {
  const where = action ? { action: { contains: action, mode: "insensitive" as const } } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
