import { createHash } from 'node:crypto';

/**
 * A small fixed-window limiter for the RFQ endpoint.
 *
 * In memory on purpose: the pilot runs as one process, and a limiter is a
 * few minutes of state, not a record. The client address is hashed with a
 * per-process salt and never written anywhere — the database holds no IP at all
 * (Part M.1 privacy note).
 *
 * When the site moves to a hosted, multi-instance deployment this becomes a
 * shared store (Redis or the platform's own limiter); the call site does not
 * change.
 */

const WINDOW_MS = Number(process.env.RFQ_RATE_WINDOW_MS ?? 10 * 60 * 1000);
const MAX_PER_WINDOW = Number(process.env.RFQ_RATE_MAX ?? 5);

export const rateLimitMax = MAX_PER_WINDOW;

const SALT = createHash('sha256')
  .update(process.env.RFQ_RATE_SALT ?? String(process.pid) + String(Date.now()))
  .digest('hex');

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

function keyFor(address: string): string {
  return createHash('sha256').update(SALT).update(address).digest('hex').slice(0, 32);
}

/** Drops expired windows so a long-running process does not accumulate keys. */
function sweep(now: number) {
  if (windows.size < 512) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function checkRateLimit(address: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const key = keyFor(address);
  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  window.count += 1;
  if (window.count > MAX_PER_WINDOW) {
    return { ok: false, retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client address behind a proxy. Only ever used for hashing. */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
