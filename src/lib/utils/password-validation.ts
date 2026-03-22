/**
 * Password strength validation for wallet security.
 *
 * Rules:
 * - Minimum 8 characters
 * - Must contain at least 2 of: uppercase, lowercase, digit, special character
 */

export interface PasswordValidationResult {
  valid: boolean;
  /** i18n key describing the first failing rule */
  errorKey: string | null;
}

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 8) {
    return { valid: false, errorKey: 'passwordTooShort' };
  }

  let categories = 0;
  if (HAS_UPPER.test(password)) categories++;
  if (HAS_LOWER.test(password)) categories++;
  if (HAS_DIGIT.test(password)) categories++;
  if (HAS_SPECIAL.test(password)) categories++;

  if (categories < 2) {
    return { valid: false, errorKey: 'passwordTooWeak' };
  }

  return { valid: true, errorKey: null };
}
