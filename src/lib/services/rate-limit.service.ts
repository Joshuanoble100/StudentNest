import { env } from "@/lib/env";
import { RateLimitError } from "@/lib/api";

/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: state is per server instance. On serverless deployments (Vercel) each
 * function instance keeps its own counters — acceptable for abuse mitigation,
 * but swap in a Redis-backed limiter (e.g. @upstash/ratelimit) for strict
 * global limits in production.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so long-lived servers don't leak memory.
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const cutoff = now - 10 * 60_000;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export function rateLimit(
  key: string,
  opts?: { max?: number; windowSeconds?: number },
): RateLimitResult {
  cleanup();
  const max = opts?.max ?? env.rateLimit.maxRequests;
  const windowMs = (opts?.windowSeconds ?? env.rateLimit.windowSeconds) * 1000;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  const allowed = bucket.timestamps.length < max;
  if (allowed) bucket.timestamps.push(now);

  const oldest = bucket.timestamps[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, max - bucket.timestamps.length),
    resetSeconds: Math.ceil((oldest + windowMs - now) / 1000),
  };
}

/** Throws RateLimitError when the limit is exceeded. */
export function assertRateLimit(
  key: string,
  opts?: { max?: number; windowSeconds?: number },
): void {
  const result = rateLimit(key, opts);
  if (!result.allowed) throw new RateLimitError();
}

/** Client identity for rate-limit keys: user id when signed in, else IP. */
export function clientKey(request: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `ip:${ip}`;
}
