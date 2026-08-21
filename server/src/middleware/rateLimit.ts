import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Request limits.
 *
 * Three different things are being protected, so there are three limits rather
 * than one global one:
 *
 *   the AI       — every chat message costs real API quota, shared across the
 *                  whole organisation. One person holding down enter could
 *                  spend the day's budget in a minute and leave nobody else
 *                  able to ask anything.
 *   sign-in      — an unauthenticated endpoint that checks a password is where
 *                  someone tries a list of passwords.
 *   everything   — a backstop so a runaway client cannot flood the database.
 *
 * ⚠️ IN-MEMORY, AND THAT IS A REAL LIMITATION. Counters live in this process,
 * so two instances would each allow the full quota, and a restart forgets
 * everything. Correct for a single instance, which is what this deploys as.
 * Multiple instances need a shared store (Redis); say so if asked rather than
 * implying this scales horizontally as written.
 */

/**
 * Count against the signed-in user where there is one, and the IP otherwise.
 *
 * Keying purely on IP would lump an entire office behind one NAT into a single
 * bucket — one busy colleague would lock out everyone else in the building.
 */
function keyFor(req: Request): string {
  const userId = (req as { auth?: { userId?: unknown } }).auth?.userId;
  return userId ? `user:${String(userId)}` : `ip:${req.ip}`;
}

const message = (text: string) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message: text },
});

/**
 * The assistant. Deliberately the tightest limit in the system.
 *
 * 20 per 5 minutes is roughly four times what a person reading the answers can
 * actually get through, so it never obstructs real use — it exists to stop a
 * script, or a stuck retry loop, from spending the organisation's quota.
 */
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  keyGenerator: keyFor,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message(
    'You are sending messages faster than the assistant can be run for everyone. Wait a minute and try again.',
  ),
});

/**
 * Sign-in and the other unauthenticated auth routes.
 *
 * Keyed by IP because there is no user yet, and counting only failures would
 * let someone learn which passwords were right before being slowed down.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many sign-in attempts. Try again in a few minutes.'),
});

/** Everything else. Generous — this is a backstop, not a throttle. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  keyGenerator: keyFor,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Slow down a little.'),
});
