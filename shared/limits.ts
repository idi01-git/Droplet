/**
 * DROPLET - Centralized Application Limits & Quotas
 * Source of truth: Droplet_Agent_Spec.md Section 5
 * All units are explicitly documented and enforced server-side.
 */

// Time constants in milliseconds
export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

// Binary byte constants (IEC units)
export const ONE_KIB = 1024;
export const ONE_MIB = 1024 * ONE_KIB;
export const ONE_GIB = 1024 * ONE_MIB;

export const DROPLET_LIMITS = {
  /** Room lifetime: 24 hours from creation. Non-extendable. */
  ROOM_LIFETIME_MS: 24 * ONE_HOUR_MS,

  /** Room code format: 4 decimal digits (0000 - 9999). */
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_REGEX: /^[0-9]{4}$/,

  /** Maximum uploaded files per room. */
  MAX_FILES_PER_ROOM: 20,

  /** Maximum file size: 50 MiB (52,428,800 bytes). */
  MAX_FILE_SIZE_BYTES: 50 * ONE_MIB,

  /** Hybrid tier threshold: Files <= 5 MiB stay local; files > 5 MiB go to S3. */
  HYBRID_S3_THRESHOLD_BYTES: 5 * ONE_MIB,

  /** Maximum total uploaded file bytes per room: 200 MiB (209,715,200 bytes). */
  MAX_ROOM_BYTES: 200 * ONE_MIB,

  /** Maximum text/link payload size: 100 KiB (102,400 bytes). */
  MAX_TEXT_SIZE_BYTES: 100 * ONE_KIB,

  /** Maximum active unexpired rooms created per IP/creator session. */
  MAX_ACTIVE_ROOMS_PER_CREATOR: 3,

  /** Maximum concurrent upload reservations active at any moment per room. */
  MAX_CONCURRENT_UPLOADS_PER_ROOM: 2,

  /** Maximum total budget for Download All (.zip): 200 MiB. */
  MAX_ZIP_BUDGET_BYTES: 200 * ONE_MIB,

  /** Upload reservation timeout before uncommitted capacity is freed: 5 minutes. */
  UPLOAD_RESERVATION_TIMEOUT_MS: 5 * ONE_MINUTE_MS,

  /** Global storage circuit breaker: 2 GiB. Preserves existing unexpired access. */
  GLOBAL_STORAGE_CIRCUIT_BREAKER_BYTES: 2 * ONE_GIB,

  /** Rate limiting policies */
  RATE_LIMITS: {
    // Max 5 room creations per 10 minutes per IP
    ROOM_CREATION: {
      WINDOW_MS: 10 * ONE_MINUTE_MS,
      MAX_REQUESTS: 5,
    },
    // Max 5 failed join attempts per 5 minutes per IP before lockout
    FAILED_JOIN: {
      WINDOW_MS: 5 * ONE_MINUTE_MS,
      MAX_ATTEMPTS: 5,
      LOCKOUT_DURATION_MS: 5 * ONE_MINUTE_MS,
    },
    // Max 30 text items per minute per session
    TEXT_ITEMS: {
      WINDOW_MS: 1 * ONE_MINUTE_MS,
      MAX_REQUESTS: 30,
    },
    // Max 60 download attempts per minute per session
    DOWNLOADS: {
      WINDOW_MS: 1 * ONE_MINUTE_MS,
      MAX_REQUESTS: 60,
    },
  },

  /** Disallowed URL schemes to prevent XSS/exploitation in links */
  DISALLOWED_URL_SCHEMES: ['javascript:', 'data:', 'vbscript:', 'file:'],
} as const;

export type DropletLimits = typeof DROPLET_LIMITS;
