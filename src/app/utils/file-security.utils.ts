/**
 * Security limits for client-side file uploads to prevent memory exhaustion / DoS attacks.
 */
export const FILE_SECURITY_LIMITS = {
  /** 15 MB limit for Excel and CSV spreadsheet files */
  MAX_EXCEL_FILE_SIZE_BYTES: 15 * 1024 * 1024,
  /** 10 MB limit for JSON backup files */
  MAX_JSON_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  /** 15 MB limit for camera photos and meter reader images */
  MAX_IMAGE_FILE_SIZE_BYTES: 15 * 1024 * 1024,
} as const;

/**
 * Validates that an uploaded file does not exceed the allowed byte threshold.
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

const FORBIDDEN_PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively sanitizes a parsed JSON object by stripping dangerous prototype pollution keys.
 */
export function sanitizeParsedJson<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeParsedJson(item)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = Object.create(null);
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (!FORBIDDEN_PROTOTYPE_KEYS.has(key)) {
      cleanObj[key] = sanitizeParsedJson(val);
    }
  }

  return cleanObj as T;
}
