/**
 * Simple in-memory rate limiter for Vercel serverless functions.
 * For production scale, swap the Map for an Upstash Redis store.
 */
const store = new Map<string, { count: number; reset: number }>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 100;

export function rateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.reset) {
    store.set(identifier, { count: 1, reset: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}
