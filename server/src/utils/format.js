/** Converts Prisma Decimal (or string/number) into a plain number for JSON. */
export function money(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  if (typeof value === 'string') return Math.round(Number(value) * 100) / 100;
  if (typeof value.toNumber === 'function') return Math.round(value.toNumber() * 100) / 100;
  return Math.round(Number(value) * 100) / 100;
}

export function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export const PAGE_SIZE_DEFAULT = 12;
export const PAGE_SIZE_MAX = 100;

export function paginationFrom(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number.parseInt(query.pageSize ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paged(data, total, { page, pageSize }) {
  return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** date-only helper: YYYY-MM-DD in local server time (used for timestamps). */
export function toDateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calendar dates (Prisma `@db.Date`) are stored as UTC midnight so a date never
 * shifts by a day when the server timezone differs from the browser. Always use
 * these helpers for date-only columns.
 */
export function toUtcDateString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/** UTC midnight for "today" in the server's local calendar, plus an offset. */
export function utcDateFromToday(offsetDays = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
}

export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function dayKey(value) {
  return toDateOnly(value);
}

export function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}
