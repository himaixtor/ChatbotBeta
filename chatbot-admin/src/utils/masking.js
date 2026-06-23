/**
 * Utility functions for masking PII data on the frontend
 */

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return local[0] + 'x'.repeat(local.length - 1) + '@' + domain;
  }
  return local.slice(0, 2) + 'x'.repeat(Math.min(6, local.length - 2)) + '@' + domain;
}

export function maskPhone(phone) {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) {
    return phone.replace(/\d/g, 'x');
  }
  let digitIndex = 0;
  const totalDigits = digits.length;
  const keepStart = 3;
  const keepEnd = 2;
  return phone.replace(/\d/g, (char) => {
    digitIndex++;
    if (digitIndex > keepStart && digitIndex <= totalDigits - keepEnd) {
      return 'x';
    }
    return char;
  });
}

export function maskText(text) {
  if (typeof text !== 'string') return text;
  
  const EMAIL_REGEX_GLOBAL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let masked = text.replace(EMAIL_REGEX_GLOBAL, (match) => maskEmail(match));
  
  const PHONE_REGEX_GLOBAL = /(\+?\d[\d-\s()]{7,}\d)/g;
  masked = masked.replace(PHONE_REGEX_GLOBAL, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return maskPhone(match);
    }
    return match;
  });
  
  return masked;
}
