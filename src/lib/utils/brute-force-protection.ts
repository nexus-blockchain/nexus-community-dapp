/**
 * Brute-force protection for wallet password attempts.
 *
 * - After 5 consecutive failures: exponential delay (2^(n-5) seconds, capped at 60s)
 * - After 10 consecutive failures: locked for 5 minutes
 * - Successful attempt resets the counter
 *
 * State is kept per-address and persisted to sessionStorage so it survives
 * page refreshes within the same tab session.
 */

interface AttemptState {
  failures: number;
  nextAllowedAt: number | null;
  lockedUntil: number | null; // timestamp ms
}

const STORAGE_KEY = 'bf_attempts';

function loadAttempts(): Map<string, AttemptState> {
  try {
    if (typeof window === 'undefined') return new Map();
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Map(JSON.parse(raw)) : new Map();
  } catch { return new Map(); }
}

function saveAttempts() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(attempts.entries())));
  } catch {}
}

const attempts = loadAttempts();

const DELAY_THRESHOLD = 5;
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DELAY_MS = 60_000; // 60s cap

function getState(address: string): AttemptState {
  if (!attempts.has(address)) {
    attempts.set(address, { failures: 0, nextAllowedAt: null, lockedUntil: null });
  }
  const state = attempts.get(address)!;
  if (state.nextAllowedAt === undefined) {
    state.nextAllowedAt = null;
  }
  return state;
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
    state.nextAllowedAt = null;
    state.lockedUntil = null;
    saveAttempts();
  }

  // Enforce cooldown between attempts after DELAY_THRESHOLD failures
  if (state.nextAllowedAt && now < state.nextAllowedAt) {
    const waitSeconds = Math.ceil((state.nextAllowedAt - now) / 1000);
    return { allowed: false, waitSeconds, errorKey: 'tooManyAttempts' };
  }

  if (state.nextAllowedAt && now >= state.nextAllowedAt) {
    state.nextAllowedAt = null;
    saveAttempts();
  }

  return { allowed: true, waitSeconds: 0, errorKey: null };
}

/** Record a failed password attempt. */
export function recordFailure(address: string): void {
  const state = getState(address);
  state.failures++;

  if (state.failures >= LOCKOUT_THRESHOLD) {
    state.nextAllowedAt = null;
    state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  } else if (state.failures >= DELAY_THRESHOLD) {
    const delayMs = Math.min(
      Math.pow(2, state.failures - DELAY_THRESHOLD) * 1000,
      MAX_DELAY_MS,
    );
    state.nextAllowedAt = Date.now() + delayMs;
  } else {
    state.nextAllowedAt = null;
  }

  saveAttempts();
}

/** Record a successful attempt (resets the counter). */
export function recordSuccess(address: string): void {
  attempts.delete(address);
  saveAttempts();
}

/** Get the current failure count for display purposes. */
export function getFailureCount(address: string): number {
  return getState(address).failures;
}
