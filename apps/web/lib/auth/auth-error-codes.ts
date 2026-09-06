// Auth error codes for specific error handling
// This file is safe to import in both server and client components
export enum AuthErrorCode {
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND",
  GENERIC_ERROR = "GENERIC_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  USE_OAUTH_PROVIDER = "USE_OAUTH_PROVIDER",
  SESSION_REFRESH_FAILED = "SESSION_REFRESH_FAILED",
  PAGE_REFRESH_FAILED = "PAGE_REFRESH_FAILED",
  // Email two-factor authentication (spec 047 — EW-139 / EW-140 / EW-141).
  /** Password accepted; a code was emailed and must be submitted next. */
  TWO_FACTOR_REQUIRED = "TWO_FACTOR_REQUIRED",
  /** Code did not match the stored hash. */
  TWO_FACTOR_INVALID = "TWO_FACTOR_INVALID",
  /** Code was valid but is past its 10-minute window. */
  TWO_FACTOR_EXPIRED = "TWO_FACTOR_EXPIRED",
  /** Too many failed codes — validation is temporarily blocked. */
  TWO_FACTOR_LOCKED = "TWO_FACTOR_LOCKED",
  /** The code could not be emailed (mail provider unavailable). */
  TWO_FACTOR_SEND_FAILED = "TWO_FACTOR_SEND_FAILED",
}
