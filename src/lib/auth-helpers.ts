import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Returns the current session user, re-checked against the database.
 * Roles and suspension status are NEVER trusted from the client or from a
 * stale JWT alone for privileged operations.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, status: true, deletedAt: true },
  });
  if (!user || user.status !== "ACTIVE" || user.deletedAt) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "You must be signed in") {
    super(message);
  }
}

/** For API routes: throws 401/403-style errors instead of redirecting. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** For pages: redirects to /login or /forbidden instead of throwing. */
export async function requireUserPage(callbackUrl = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

export async function requireRolePage(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

/** True when the user may manage the given property (owner or admin). */
export function canManageProperty(user: SessionUser, ownerId: string): boolean {
  return user.id === ownerId || user.role === "ADMIN";
}
