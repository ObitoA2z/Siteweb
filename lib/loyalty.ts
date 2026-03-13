/**
 * Fidélité, parrainage et relances clientes.
 *
 * Règles :
 *  - 1 séance confirmée = 1 point
 *  - 5 points → -20% sur la prochaine séance (reward_applied)
 *  - 1 parrainage validé (amie réserve) → +2 points pour la marraine
 *  - Relance : clientes sans visite depuis ≥ REENGAGE_WEEKS semaines
 */

import { randomBytes } from "node:crypto";

import { getDb } from "@/lib/db";
import type {
  CustomerToReengage,
  LoyaltyEvent,
  LoyaltyEventType,
  LoyaltyStatus,
  ReferralInfo,
} from "@/lib/types";

export const LOYALTY_POINTS_PER_BOOKING = 1;
export const LOYALTY_REWARD_THRESHOLD = 5;   // points pour déclencher une récompense
export const LOYALTY_REWARD_DISCOUNT = 20;   // % de réduction
export const REFERRAL_BONUS_POINTS = 2;       // points offerts à la marraine
export const REENGAGE_WEEKS = 8;              // semaines d'inactivité avant relance

// ─── Codes de parrainage ──────────────────────────────────────────────────────

/** Génère (ou retourne) le code de parrainage d'un client. */
export function getOrCreateReferralCode(customerId: number): string {
  const db = getDb();

  const row = db
    .prepare("SELECT referral_code FROM customer_users WHERE id = ?")
    .get(customerId) as { referral_code: string | null } | undefined;

  if (row?.referral_code) {
    return row.referral_code;
  }

  // Génère un code court unique : 6 chars alphanumériques majuscules
  let code: string;
  let attempts = 0;
  do {
    code = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    attempts++;
    if (attempts > 20) throw new Error("Impossible de générer un code unique.");
  } while (
    db
      .prepare("SELECT 1 FROM customer_users WHERE referral_code = ?")
      .get(code)
  );

  db.prepare("UPDATE customer_users SET referral_code = ? WHERE id = ?").run(code, customerId);
  return code;
}

/** Retourne le client propriétaire d'un code de parrainage, ou null. */
export function getCustomerByReferralCode(code: string): { id: number; name: string } | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT id, name FROM customer_users WHERE referral_code = ?")
      .get(code.trim().toUpperCase()) as { id: number; name: string } | undefined) ?? null
  );
}

/** Enregistre un parrainage quand une amie s'inscrit avec le code. */
export function registerReferral(referrerId: number, referredId: number): boolean {
  const db = getDb();

  const tx = db.transaction(() => {
    // Vérifie que l'amie n'a pas déjà été parrainée
    const existing = db
      .prepare("SELECT 1 FROM referrals WHERE referred_id = ?")
      .get(referredId);
    if (existing) return false;

    // Pas d'auto-parrainage
    if (referrerId === referredId) return false;

    db.prepare(
      "INSERT OR IGNORE INTO referrals (referrer_id, referred_id, status) VALUES (?, ?, 'pending')",
    ).run(referrerId, referredId);

    db.prepare(
      "UPDATE customer_users SET referred_by_id = ? WHERE id = ? AND referred_by_id IS NULL",
    ).run(referrerId, referredId);

    return true;
  });

  return Boolean(tx());
}

/** Récompense la marraine quand l'amie parrainée confirme sa 1ère réservation. */
export function rewardReferrerIfEligible(referredId: number): void {
  const db = getDb();

  const referral = db
    .prepare(
      "SELECT id, referrer_id FROM referrals WHERE referred_id = ? AND status = 'pending'",
    )
    .get(referredId) as { id: number; referrer_id: number } | undefined;

  if (!referral) return;

  // Vérifie que c'est bien la 1ère réservation confirmée de l'amie
  const confirmedCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM bookings b
         JOIN customer_users cu ON lower(b.customer_email) = lower(cu.email)
         WHERE cu.id = ? AND b.status = 'confirmed'`,
      )
      .get(referredId) as { cnt: number }
  ).cnt;

  if (confirmedCount !== 1) return;

  const tx = db.transaction(() => {
    addLoyaltyPoints(referral.referrer_id, REFERRAL_BONUS_POINTS, "referral_earned", null,
      `Parrainage validé (amie #${referredId})`);

    db.prepare(
      "UPDATE referrals SET status = 'rewarded', rewarded_at = datetime('now') WHERE id = ?",
    ).run(referral.id);
  });

  tx();
}

// ─── Points de fidélité ───────────────────────────────────────────────────────

/** Ajoute des points au compte fidélité d'un client. */
export function addLoyaltyPoints(
  customerId: number,
  points: number,
  eventType: LoyaltyEventType,
  bookingId: number | null,
  description?: string,
): void {
  const db = getDb();

  db.prepare(
    `INSERT INTO loyalty_events (customer_id, event_type, points, booking_id, description)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(customerId, eventType, points, bookingId, description ?? null);

  db.prepare(
    "UPDATE customer_users SET loyalty_points = loyalty_points + ? WHERE id = ?",
  ).run(points, customerId);
}

/** Crédite 1 point pour une réservation confirmée (appelé depuis confirmBooking). */
export function creditBookingConfirmedPoint(customerId: number, bookingId: number): void {
  addLoyaltyPoints(
    customerId,
    LOYALTY_POINTS_PER_BOOKING,
    "booking_confirmed",
    bookingId,
    "Séance confirmée",
  );
}

/** Retourne le statut fidélité d'un client (points, remise applicable). */
export function getLoyaltyStatus(customerId: number): LoyaltyStatus {
  const db = getDb();

  const row = db
    .prepare("SELECT loyalty_points FROM customer_users WHERE id = ?")
    .get(customerId) as { loyalty_points: number } | undefined;

  const totalPoints = row?.loyalty_points ?? 0;

  // Nombre de séances confirmées total
  const { cnt: confirmedBookings } = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM bookings b
       JOIN customer_users cu ON lower(b.customer_email) = lower(cu.email)
       WHERE cu.id = ? AND b.status = 'confirmed'`,
    )
    .get(customerId) as { cnt: number };

  // La remise s'applique par tranche de REWARD_THRESHOLD points
  const earnedRewards = Math.floor(totalPoints / LOYALTY_REWARD_THRESHOLD);
  const usedRewards = (
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM loyalty_events
         WHERE customer_id = ? AND event_type = 'reward_applied'`,
      )
      .get(customerId) as { cnt: number }
  ).cnt;

  const discountPercent = earnedRewards > usedRewards ? LOYALTY_REWARD_DISCOUNT : 0;
  const pointsInCurrentCycle = totalPoints % LOYALTY_REWARD_THRESHOLD;
  const nextRewardAt = LOYALTY_REWARD_THRESHOLD - pointsInCurrentCycle;

  return {
    customerId,
    totalPoints,
    confirmedBookings,
    nextRewardAt,
    discountPercent,
  };
}

/** Historique des points d'un client. */
export function getLoyaltyHistory(customerId: number): LoyaltyEvent[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, customer_id AS customerId, event_type AS eventType,
              points, booking_id AS bookingId, description, created_at AS createdAt
       FROM loyalty_events WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(customerId) as LoyaltyEvent[];
}

/** Info de parrainage d'un client. */
export function getReferralInfo(customerId: number): ReferralInfo {
  const db = getDb();

  const code = getOrCreateReferralCode(customerId);

  const { total, rewarded } = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'rewarded' THEN 1 ELSE 0 END) AS rewarded
       FROM referrals WHERE referrer_id = ?`,
    )
    .get(customerId) as { total: number; rewarded: number };

  return {
    referralCode: code,
    totalReferrals: total ?? 0,
    rewardedReferrals: rewarded ?? 0,
    pendingReferrals: (total ?? 0) - (rewarded ?? 0),
  };
}

// ─── Relances clientes ────────────────────────────────────────────────────────

/**
 * Retourne les clientes sans visite depuis ≥ weeksThreshold semaines.
 * Triées par dernière visite la plus récente en premier.
 */
export function getCustomersToReengage(weeksThreshold = REENGAGE_WEEKS): CustomerToReengage[] {
  const db = getDb();

  const rows = db
    .prepare(
      `
      SELECT
        cu.id           AS customerId,
        b.customer_name AS customerName,
        b.customer_email AS customerEmail,
        b.customer_phone AS customerPhone,
        MAX(b.start_at) AS lastBookingAt,
        s.name          AS lastServiceName,
        COUNT(b.id)     AS totalConfirmedBookings,
        COALESCE(cu.loyalty_points, 0) AS loyaltyPoints,
        CAST(
          (julianday('now') - julianday(MAX(b.start_at))) / 7.0
        AS INTEGER)     AS weeksSinceLastVisit
      FROM bookings b
      JOIN slots sl ON sl.id = b.slot_id
      JOIN services s ON s.id = sl.service_id
      LEFT JOIN customer_users cu ON lower(cu.email) = lower(b.customer_email)
      WHERE b.status = 'confirmed'
      GROUP BY lower(b.customer_email)
      HAVING weeksSinceLastVisit >= ?
      ORDER BY lastBookingAt DESC
      LIMIT 200
      `,
    )
    .all(weeksThreshold) as CustomerToReengage[];

  return rows;
}

/** Nombre total de clientes à relancer. */
export function getReengageCount(weeksThreshold = REENGAGE_WEEKS): number {
  const db = getDb();
  const { cnt } = db
    .prepare(
      `
      SELECT COUNT(*) AS cnt FROM (
        SELECT lower(b.customer_email)
        FROM bookings b
        WHERE b.status = 'confirmed'
        GROUP BY lower(b.customer_email)
        HAVING CAST((julianday('now') - julianday(MAX(b.start_at))) / 7.0 AS INTEGER) >= ?
      )
      `,
    )
    .get(weeksThreshold) as { cnt: number };
  return cnt;
}
