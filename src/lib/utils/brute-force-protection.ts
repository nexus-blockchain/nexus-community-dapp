/**
 * Brute-force protection for wallet password attempts.
 *
 * - After 5 consecutive failures: exponential delay (2^(n-5) seconds, capped at 60s)
 * - After 10 consecutive failures: locked for 5 minutes
 * - Successful attempt resets the counter
 *
 * State is kept per-address in memory (resets on page refresh, which is acceptable
 * since the encrypted keystore itself is the primary defence).
 */

interface AttemptState {
  failures: number;
  lockedUntil: number | null; // timestamp ms
}

const attempts = new Map<string, AttemptState>();

const DELAY_THRESHOLD = 5;
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DELAY_MS = 60_000; // 60s cap

function getState(address: string): AttemptState {
  if (!attempts.has(address)) {
    attempts.set(address, { failures: 0, lockedUntil: null });
  }
  return attempts.get(address)!;
}

export interface BruteForceCheck {
  allowed: boolean;
  /** If not allowed, seconds the user must wait */
  waitSeconds: number;
  /** i18n key for the error */
  errorKey: 'accountLockedOut' | 'tooManyAttempts' | null;
}

/** Check if an attempt is currently allowed for the given address. */
export function checkAttemptAllowed(address: string): BruteForceCheck {
  const state = getState(address);
  const now = Date.now();

  // Check hard lockout
  if (state.lockedUntil && now < state.lockedUntil) {
    const waitSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds, errorKey: 'accountLockedOut' };
  }

  // If lockout expired, reset
  if (state.lockedUntil && now >= state.lockedUntil) {
    state.failures = 0;
    state.lockedUntil = null;
  }

  // Check exponential delay (after DELAY_THRESHOLD failures)
  if (state.failures >= DELAY_THRESHOLD) {
    const delayMs = Math.min(
      Math.pow(2, state.failures - DELAY_THRESHOLD) * 1000,
      MAX_DELAY_MS,
    );
    // We don't track "last attempt time" — the delay is enforced via
    // a UI countdown instead. The check always allows but returns waitSeconds
    // so the UI can display a countdown before enabling the button.
    return { allowed: true, waitSeconds: Math.ceil(delayMs / 1000), errorKey: 'tooManyAttempts' };
  }

  return { allowed: true, waitSeconds: 0, errorKey: null };
}

/** Record a failed password attempt. */
export function recordFailure(address: string): void {
  const state = getState(address);
  state.failures++;

  if (state.failures >= LOCKOUT_THRESHOLD) {
    state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
}

/** Record a successful attempt (resets the counter). */
export function recordSuccess(address: string): void {
  attempts.delete(address);
}

/** Get the current failure count for display purposes. */
export function getFailureCount(address: string): number {
  return getState(address).failures;
}
