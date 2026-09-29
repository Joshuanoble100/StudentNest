import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/services/auth.service";
import { auditLog } from "@/lib/services/audit.service";
import type {
  NotificationPreferenceInput,
  PasswordChangeInput,
  ProfileUpdateInput,
} from "@/lib/validation/auth";

export class SettingsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** The editable account surface: user row + profile + notification preferences. */
export async function getAccountSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      profile: {
        include: {
          university: { select: { id: true, name: true, shortName: true } },
          campus: { select: { id: true, name: true } },
          faculty: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          notificationPreference: true,
        },
      },
    },
  });
  if (!user) throw new SettingsError("Account not found", 404);
  return user;
}

async function ensureProfile(userId: string) {
  const existing = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.profile.create({ data: { userId }, select: { id: true } });
  return created.id;
}

export async function updateProfile(
  actor: { id: string; email: string },
  input: ProfileUpdateInput,
) {
  const phoneChanged = input.phone !== undefined;
  const nameChanged =
    input.displayName !== undefined && input.displayName.trim().length >= 2;

  const profileId = await ensureProfile(actor.id);

  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName || null } : {}),
      ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.universityId !== undefined ? { universityId: input.universityId } : {}),
      ...(input.campusId !== undefined ? { campusId: input.campusId } : {}),
      ...(input.facultyId !== undefined ? { facultyId: input.facultyId } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.level !== undefined ? { level: input.level || null } : {}),
    },
    include: {
      university: { select: { id: true, name: true, shortName: true } },
      campus: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  const user = await prisma.user.update({
    where: { id: actor.id },
    data: {
      ...(nameChanged ? { name: input.displayName!.trim() } : {}),
      ...(phoneChanged ? { phone: input.phone ?? null } : {}),
    },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  await auditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "account.profile_update",
    entityType: "Profile",
    entityId: profileId,
  });

  return { user, profile };
}

export async function changePassword(
  actor: { id: string; email: string },
  input: PasswordChangeInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new SettingsError("Account not found", 404);

  // Accounts created through an OAuth provider have no password to compare.
  if (!user.passwordHash) {
    throw new SettingsError(
      "This account signs in with a linked provider and has no password to change.",
      400,
    );
  }

  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) throw new SettingsError("Current password is incorrect", 403);
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new SettingsError("New password must be different from the current one");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  await auditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "account.password_change",
    entityType: "User",
    entityId: actor.id,
  });

  return { changed: true };
}

export async function updateNotificationPreferences(
  actor: { id: string; email: string },
  input: NotificationPreferenceInput,
) {
  const profileId = await ensureProfile(actor.id);

  const preference = await prisma.notificationPreference.upsert({
    where: { profileId },
    create: { profileId, ...input },
    update: input,
  });

  await auditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "account.notification_preferences",
    entityType: "NotificationPreference",
    entityId: preference.id,
  });

  return preference;
}
