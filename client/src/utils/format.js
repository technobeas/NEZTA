import { format, isToday, isTomorrow, parseISO } from 'date-fns';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value, { precise = false } = {}) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '₹0';
  return precise || !Number.isInteger(number) ? inrPrecise.format(number) : inr.format(number);
}

export function compactMoney(value) {
  const number = Number(value ?? 0);
  if (number >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (number >= 1000) return `₹${(number / 1000).toFixed(1)}k`;
  return money(number);
}

export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export function toDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return format(date, pattern);
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return format(date, 'dd MMM yyyy, h:mm a');
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return format(date, 'h:mm a');
}

export function relativeDay(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'dd MMM');
}

/** Date-only columns come back as UTC midnight; format them without timezone drift. */
export function formatDateOnly(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return format(date, pattern);
    }
  }
  return formatDate(value, pattern);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function pluralise(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

export function localDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return format(date, 'yyyy-MM-dd');
}

export function parseLocalDate(value) {
  if (!value) return null;
  return parseISO(`${value}T00:00:00`);
}
