import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-helpers";

/** Standard JSON envelope helpers for API routes. */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: { message, details } }, { status });
}

export function validationFail(error: ZodError): NextResponse {
  const details = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return fail("Validation failed", 422, details);
}

/**
 * Wraps a route handler, converting thrown errors into safe JSON responses.
 * Stack traces and internal messages are never exposed to clients.
 *
 * Service errors carrying a numeric `status` are treated as user-facing and
 * their message is returned; anything else becomes a generic 500.
 */
export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) return validationFail(error);
  if (error instanceof UnauthorizedError) return fail(error.message, 401);
  if (error instanceof ForbiddenError) return fail(error.message, 403);
  if (error instanceof RateLimitError) return fail(error.message, 429);

  const status = error instanceof Error ? (error as { status?: unknown }).status : undefined;
  if (typeof status === "number" && status >= 400 && status < 600 && error instanceof Error) {
    return fail(error.message, status);
  }

  console.error(`[api:${context}]`, error instanceof Error ? error.message : error);
  return fail("Something went wrong. Please try again.", 500);
}

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please slow down.") {
    super(message);
  }
}
