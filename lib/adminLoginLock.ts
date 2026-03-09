type LoginAttemptState = {
  failures: number;
  lockedUntil: number;
  updatedAt: number;
};

const states = new Map<string, LoginAttemptState>();

const MAX_LOCK_SECONDS = 15 * 60;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;

function nowMs(): number {
  return Date.now();
}

function cleanup() {
  const now = nowMs();
  for (const [key, value] of states.entries()) {
    if (now - value.updatedAt > CLEANUP_AFTER_MS) {
      states.delete(key);
    }
  }
}

function getPenaltySeconds(failures: number): number {
  // 5s, 10s, 20s, 40s... jusqu'a 15 min max
  return Math.min(MAX_LOCK_SECONDS, 5 * 2 ** Math.max(0, failures - 1));
}

export function getAdminLoginLockSeconds(key: string): number {
  cleanup();
  const state = states.get(key);
  if (!state) {
    return 0;
  }

  const remainingMs = state.lockedUntil - nowMs();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function registerAdminLoginFailure(key: string): number {
  const now = nowMs();
  const current = states.get(key) ?? { failures: 0, lockedUntil: 0, updatedAt: now };
  const failures = current.failures + 1;
  const penaltySeconds = getPenaltySeconds(failures);

  states.set(key, {
    failures,
    lockedUntil: now + penaltySeconds * 1000,
    updatedAt: now,
  });

  return penaltySeconds;
}

export function clearAdminLoginFailures(key: string) {
  states.delete(key);
}

