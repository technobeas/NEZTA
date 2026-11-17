import { toDateOnly } from './format.js';

export function compactDate(date = new Date()) {
  return toDateOnly(date).replace(/-/g, '').slice(2);
}

export function randomDigits(length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((byte) => byte % 10)
    .join('');
}

export function orderNumber(prefix = 'NZ') {
  return `${prefix}-${compactDate()}-${randomDigits(4)}`;
}

export function enquiryNumber() {
  return `ENQ-${compactDate()}-${randomDigits(3)}`;
}

export function quotationNumber() {
  return `QT-${compactDate()}-${randomDigits(3)}`;
}

export function bulkOrderNumber() {
  return `BLK-${compactDate()}-${randomDigits(3)}`;
}

export function subscriptionNumber() {
  return `SUB-${compactDate()}-${randomDigits(3)}`;
}

export function deliveryOtp() {
  return randomDigits(4);
}
