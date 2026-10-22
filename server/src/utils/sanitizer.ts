import path from 'path';
import { DROPLET_LIMITS } from '../../../shared/limits';

/**
 * Validate that a URL has a safe protocol (http: or https:).
 * Explicitly rejects javascript:, data:, vbscript:, file:, etc.
 */
export function isValidSafeUrl(rawUrl: string): boolean {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return false;

    // Reject dangerous schemes
    const lower = trimmed.toLowerCase();
    for (const scheme of DROPLET_LIMITS.DISALLOWED_URL_SCHEMES) {
      if (lower.startsWith(scheme)) {
        return false;
      }
    }

    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize a user-provided filename to prevent path traversal or special characters.
 * Strips path separators, null bytes, and windows-reserved characters.
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename) return 'unnamed-file';

  // Get base name without directory components
  let clean = path.basename(rawFilename);

  // Remove null bytes and non-printable characters
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Remove dangerous Windows/Unix characters: / \ : * ? " < > |
  clean = clean.replace(/[/\\:*?"<>|]/g, '_');

  // Strip leading and trailing periods/spaces
  clean = clean.trim().replace(/^\.+/, '');

  if (!clean) {
    clean = 'unnamed-file';
  }

  // Limit filename length to 255 chars
  return clean.slice(0, 255);
}

/**
 * Escape HTML characters to prevent XSS when rendering user content.
 */
export function escapeHtml(unsafeText: string): string {
  return unsafeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
