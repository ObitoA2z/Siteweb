/**
 * Protection brute-force pour la connexion client.
 *
 * Stratégie à deux niveaux :
 *  1. Clé "ip:email" — bloque un attaquant précis sur un compte précis.
 *     → Empêche le lockout ciblé (DoS) : un attaquant depuis une IP différente
 *       ne peut pas verrouiller le compte d'un autre utilisateur.
 *  2. Clé "ip" seule — bloque une IP qui essaie de nombreux comptes différents.
 *     → Protège contre le password-spraying.
 *
 * Les appelants doivent fournir DEUX clés séparées et appeler les deux fonctions.
 */

type LoginAttemptState = {
  failures: number;
  lockedUntil: number;
  updatedAt: number;
};

const states = new Map<string, LoginAttemptState>();

const MAX_LOCK_SECONDS = 10 * 60;
// Taille max pour éviter DoS mémoire
const MAX_STATES = 20_000;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let lastCleanup = Date.now();

function nowMs(): number {
  return Date.now();
}

function cleanup() {
  const now = nowMs();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;

  for (const [key, value] of states.entries()) {
    if (now - value.updatedAt > CLEANUP_AFTER_MS) {
      states.delete(key);
    }
  }

  // Protection de dernier recours contre le flooding
  if (states.size > MAX_STATES) {
    console.warn(
      `[loginLock] states size (${states.size}) depasse MAX_STATES (${MAX_STATES}), vidage complet.`,
    );
    states.clear();
    lastCleanup = now;
  }
}

function getPenaltySeconds(failures: number): number {
  // 3s, 6s, 12s, 24s... jusqu'à 10 min max
  return Math.min(MAX_LOCK_SECONDS, 3 * 2 ** Math.max(0, failures - 1));
}

export function getCustomerLoginLockSeconds(key: string): number {
  cleanup();
  const state = states.get(key);
  if (!state) {
    return 0;
  }

  const remainingMs = state.lockedUntil - nowMs();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function registerCustomerLoginFailure(key: string): number {
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

export function clearCustomerLoginFailures(key: string) {
  states.delete(key);
}
