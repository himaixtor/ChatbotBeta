/**
 * Utility functions for masking PII data (Emails, Phone numbers)
 */

/**
 * Masks an email address by keeping the first 2 characters of the local part,
 * replacing the rest with 'x' (up to a limit), and keeping the domain part.
 * Example: john.doe@example.com -> joxxxx@example.com
 */
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return email;
  }
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return local[0] + 'x'.repeat(local.length - 1) + '@' + domain;
  }
  return local.slice(0, 2) + 'x'.repeat(Math.min(6, local.length - 2)) + '@' + domain;
}

/**
 * Masks a phone number by keeping the first 3 digits and the last 2 digits
 * unmasked, and replacing all middle digits with 'x'. Preserves formatting.
 * Example: +91 98765 43210 -> +91 9xx xx xxxxx10 (or matching digit index)
 */
function maskPhone(phone) {
  if (typeof phone !== 'string' || !phone) return phone;
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

/**
 * Identifies emails and phone numbers inside free-form text and masks them.
 */
function maskText(text) {
  if (typeof text !== 'string') return text;
  
  // Mask emails using global regex
  const EMAIL_REGEX_GLOBAL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let masked = text.replace(EMAIL_REGEX_GLOBAL, (match) => maskEmail(match));
  
  // Mask phone numbers (sequences of digits, possibly separated by spaces, dashes, etc.)
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

module.exports = {
  maskEmail,
  maskPhone,
  maskText,
};
