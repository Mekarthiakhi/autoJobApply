/**
 * Extracts a normalized mobile/WhatsApp phone number from raw resume text.
 * Supports international formats (+91, +1, +44, etc.) and 10-digit Indian mobile numbers.
 */
export function extractMobilePhoneFromResume(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  // Focus first on the header/contact area (top 1500 chars), then fall back to full text
  const headerSlice = text.slice(0, 1500);
  const candidates = [headerSlice, text];

  for (const chunk of candidates) {
    // 1. Explicit international format: +CC followed by 10-12 digits (allowing spaces/dashes/parens)
    const intlRegex = /\+\d{1,3}[\s.-]?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g;
    const intlMatches = chunk.match(intlRegex) || [];
    for (const raw of intlMatches) {
      const digits = raw.replace(/[^0-9]/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        return `+${digits}`;
      }
    }

    // 2. 10-digit Indian mobile number (starts with 6, 7, 8, or 9) not part of a longer number or year range
    const indiaRegex = /(?:^|[^\d+])([6-9]\d{4}[\s.-]?\d{5})(?!\d)/g;
    let m: RegExpExecArray | null;
    while ((m = indiaRegex.exec(chunk)) !== null) {
      const digits = m[1].replace(/[^0-9]/g, '');
      if (digits.length === 10) {
        return `+91${digits}`;
      }
    }

    // 3. Standard US/Canada 10-digit phone: (555) 123-4567 or 555-123-4567
    const usRegex = /(?:^|[^\d+])(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})(?!\d)/g;
    while ((m = usRegex.exec(chunk)) !== null) {
      const digits = m[1].replace(/[^0-9]/g, '');
      if (digits.length === 10) {
        return `+1${digits}`;
      }
    }
  }

  return null;
}

export function normalizePhoneNumber(phone: string): string {
  const cleaned = (phone || '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.replace(/[^0-9]/g, '');
  }
  const digits = cleaned.replace(/[^0-9]/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  return digits ? `+${digits}` : '';
}
