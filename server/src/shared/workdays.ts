/**
 * Working-day arithmetic for the leave module.
 *
 * Leave is counted in working days, not calendar days: Friday → Monday is two
 * days off, not four. Everything here works in UTC on purpose — a leave date is
 * a calendar date ("2026-08-12"), not an instant, and parsing it in the server's
 * local timezone would shift it by a day for anyone east or west of the host.
 */

/** Parse a `YYYY-MM-DD` date string as UTC midnight. */
export function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today at UTC midnight — the earliest date leave may start. */
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Count Mon–Fri days in an inclusive [from, to] range.
 *
 * M2 seam: when the `holidays` collection lands, pass the company's holiday
 * dates as `excluded` and public holidays stop consuming leave balance. The
 * signature already takes them so callers need no change.
 */
export function countWorkingDays(from: Date, to: Date, excluded: Date[] = []): number {
  const skip = new Set(excluded.map((d) => d.getTime()));
  let days = 0;

  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    const day = new Date(t);
    const weekday = day.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (weekday !== 0 && weekday !== 6 && !skip.has(t)) days += 1;
  }

  return days;
}
