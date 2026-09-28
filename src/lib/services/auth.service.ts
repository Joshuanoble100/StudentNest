import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { sendEmail } from "@/lib/services/email.service";
import { env } from "@/lib/env";
import { TokenType } from "@prisma/client";
import { auditLog } from "./audit.service";

export const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = "auth_error",
    public status: number = 400,
  ) {
    super(message);
  }
}

/**
 * Registers a new STUDENT / LANDLORD / AGENT account.
 * ADMIN accounts are never self-service — they are promoted by an existing admin.
 * Returns the created user (without passwordHash).
 */
export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    throw new AuthError("An account with this email already exists", "email_taken", 409);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone ?? null,
      role: data.role,
      passwordHash,
      profile: {
        create: {
          displayName: data.name,
          universityId: data.universityId ?? null,
          campusId: data.campusId ?? null,
          notificationPreference: { create: {} },
        },
      },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await issueEmailVerificationToken(user.id, user.email);
  await auditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "user.register",
    entityType: "User",
    entityId: user.id,
    metadata: { role: data.role },
  });

  return user;
}

export async function issueEmailVerificationToken(userId: string, email: string) {
  const token = generateToken();
  await prisma.authToken.create({
    data: {
      userId,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${env.appUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your StudentNest email",
    text: `Welcome to StudentNest!\n\nVerify your email by opening this link (valid 24h):\n${link}\n\nIf you did not create an account, ignore this email.`,
    html: `<p>Welcome to <strong>StudentNest</strong>!</p><p><a href="${link}">Verify your email</a> (valid 24 hours).</p><p>If you did not create an account, ignore this email.</p>`,
  });
  return link;
}

export async function verifyEmailToken(token: string): Promise<string> {
  const found = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!found || found.type !== TokenType.EMAIL_VERIFICATION) {
    throw new AuthError("Invalid verification link", "invalid_token", 400);
  }
  if (found.usedAt) throw new AuthError("This link was already used", "token_used", 400);
  if (found.expiresAt < new Date()) throw new AuthError("This link has expired", "token_expired", 400);

  await prisma.$transaction([
    prisma.authToken.update({ where: { id: found.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: found.userId }, data: { emailVerified: new Date() } }),
  ]);
  return found.userId;
}

/** Always resolves successfully to avoid leaking which emails exist. */
export async function requestPasswordReset(email: string) {
  const normalized = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || user.status !== "ACTIVE") return;

  const token = generateToken();
  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: TokenType.PASSWORD_RESET,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const link = `${env.appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your StudentNest password",
    text: `Reset your password (valid 1 hour):\n${link}\n\nIf you did not request this, ignore this email.`,
    html: `<p><a href="${link}">Reset your password</a> — valid for 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);
  const found = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(data.token) } });
  if (!found || found.type !== TokenType.PASSWORD_RESET || found.usedAt || found.expiresAt < new Date()) {
    throw new AuthError("Invalid or expired reset link", "invalid_token", 400);
  }
  const passwordHash = await hashPassword(data.password);
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: found.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: found.userId }, data: { passwordHash } }),
  ]);
  await auditLog({
    actorId: found.userId,
    action: "user.password_reset",
    entityType: "User",
    entityId: found.userId,
  });
}

/**
 * Validates credentials for the NextAuth authorize callback.
 * Returns the user record or null — never throws for bad credentials.
 */
export async function authenticateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return null;
  if (user.status !== "ACTIVE") return null;
  if (user.deletedAt) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return user;
}
