import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

import { env } from "@/lib/env";
import { getUtcBoundsForLocalDay, isoToLocalDate } from "@/lib/time";
import type {
  AuditLogItem,
  BusinessSettings,
  Booking,
  BookingStatus,
  ClosedDay,
  CustomerAccountSummary,
  CustomerUser,
  Service,
  Slot,
  SlotStatus,
  WaitlistEntry,
  WaitlistStatus,
} from "@/lib/types";

const MIGRATION_TABLE = "__migrations";

type DbInstance = Database.Database;

class BookingConflictError extends Error {
  constructor() {
    super("Slot already booked or unavailable.");
    this.name = "BookingConflictError";
  }
}

class DailyLimitExceededError extends Error {
  constructor() {
    super("Daily booking limit reached.");
    this.name = "DailyLimitExceededError";
  }
}

class CustomerBlockedError extends Error {
  constructor() {
    super("Customer is blocked from booking.");
    this.name = "CustomerBlockedError";
  }
}

declare global {
  var __lashDb: DbInstance | undefined;
  var __lashDbReady: boolean | undefined;
}

function resolveDbPath(): string {
  return path.resolve(process.cwd(), env.DB_PATH);
}

function ensureDbDirectory() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function createDb(): DbInstance {
  ensureDbDirectory();
  const db = new Database(resolveDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): DbInstance {
  if (!globalThis.__lashDb) {
    globalThis.__lashDb = createDb();
  }
  return globalThis.__lashDb;
}

function ensureMigrationsTable(db: DbInstance) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getMigrationFiles(): string[] {
  const migrationDir = path.join(process.cwd(), "migrations");
  if (!fs.existsSync(migrationDir)) {
    return [];
  }
  return fs
    .readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

export function runPendingMigrations() {
  const db = getDb();
  ensureMigrationsTable(db);

  const applied = new Set<string>(
    db
      .prepare(`SELECT filename FROM ${MIGRATION_TABLE}`)
      .all()
      .map((row) => (row as { filename: string }).filename),
  );

  for (const filename of getMigrationFiles()) {
    if (applied.has(filename)) {
      continue;
    }

    const migrationPath = path.join(process.cwd(), "migrations", filename);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare(`INSERT INTO ${MIGRATION_TABLE} (filename) VALUES (?)`).run(filename);
    });

    apply();
  }
}

export function bootstrapAdminUser() {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM admin_users LIMIT 1").get() as { id: number } | undefined;
  if (existing) {
    return;
  }

  const passwordHash = bcrypt.hashSync(env.ADMIN_PASSWORD, 12);
  db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)")
    .run(env.ADMIN_USERNAME, passwordHash);
}

function initializeDatabase() {
  if (globalThis.__lashDbReady) {
    return;
  }
  runPendingMigrations();
  bootstrapAdminUser();
  globalThis.__lashDbReady = true;
}

initializeDatabase();

function mapService(row: {
  id: number;
  name: string;
  durationMin: number;
  priceCents: number;
  isActive: number;
}): Service {
  return {
    id: row.id,
    name: row.name,
    durationMin: row.durationMin,
    priceCents: row.priceCents,
    isActive: row.isActive === 1,
  };
}

function mapSlot(row: {
  id: number;
  serviceId: number;
  serviceName?: string;
  startAt: string;
  endAt: string;
  status: SlotStatus;
  createdAt: string;
}): Slot {
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function mapBusinessSettings(row: {
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  workingDays: string;
  dailyBookingLimit: number;
  maxOverbooking: number;
  maxCancellationsBeforeBlock: number;
  updatedAt: string;
}): BusinessSettings {
  return {
    openTime: row.openTime,
    closeTime: row.closeTime,
    breakStart: row.breakStart,
    breakEnd: row.breakEnd,
    workingDays: row.workingDays
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    dailyBookingLimit: row.dailyBookingLimit,
    maxOverbooking: row.maxOverbooking,
    maxCancellationsBeforeBlock: row.maxCancellationsBeforeBlock,
    updatedAt: row.updatedAt,
  };
}

function toWorkingDaysText(days: number[]): string {
  const unique = [...new Set(days)].filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  unique.sort((a, b) => a - b);
  return unique.join(",");
}

function mapCustomerUser(row: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  googleId: string | null;
  createdAt: string;
}): CustomerUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.passwordHash,
    googleId: row.googleId,
    createdAt: row.createdAt,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addAuditLog(input: {
  eventType: string;
  actorType: "admin" | "system" | "customer";
  actorId?: string | null;
  message: string;
  meta?: unknown;
}) {
  const db = getDb();
  const metaJson = input.meta ? JSON.stringify(input.meta) : null;
  db.prepare(
    `
    INSERT INTO audit_log (event_type, actor_type, actor_id, message, meta_json)
    VALUES (?, ?, ?, ?, ?)
    `,
  ).run(input.eventType, input.actorType, input.actorId ?? null, input.message, metaJson);
}

export function listAuditLogs(filters: { eventType?: string; startUtc?: string; endUtc?: string } = {}): AuditLogItem[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.eventType) {
    clauses.push("event_type = ?");
    values.push(filters.eventType);
  }
  if (filters.startUtc) {
    clauses.push("created_at >= ?");
    values.push(filters.startUtc.slice(0, 19).replace("T", " "));
  }
  if (filters.endUtc) {
    clauses.push("created_at < ?");
    values.push(filters.endUtc.slice(0, 19).replace("T", " "));
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
      SELECT
        id,
        event_type AS eventType,
        actor_type AS actorType,
        actor_id AS actorId,
        message,
        meta_json AS metaJson,
        strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS createdAt
      FROM audit_log
      ${where}
      ORDER BY created_at DESC
      LIMIT 800
      `,
    )
    .all(...values) as AuditLogItem[];

  return rows;
}

export function getBusinessSettings(): BusinessSettings {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        open_time AS openTime,
        close_time AS closeTime,
        break_start AS breakStart,
        break_end AS breakEnd,
        working_days AS workingDays,
        daily_booking_limit AS dailyBookingLimit,
        max_overbooking AS maxOverbooking,
        max_cancellations_before_block AS maxCancellationsBeforeBlock,
        strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) AS updatedAt
      FROM business_settings
      WHERE id = 1
      `,
    )
    .get() as
    | {
        openTime: string;
        closeTime: string;
        breakStart: string;
        breakEnd: string;
        workingDays: string;
        dailyBookingLimit: number;
        maxOverbooking: number;
        maxCancellationsBeforeBlock: number;
        updatedAt: string;
      }
    | undefined;

  if (row) {
    return mapBusinessSettings(row);
  }

  db.prepare("INSERT OR IGNORE INTO business_settings (id) VALUES (1)").run();
  return getBusinessSettings();
}

export function updateBusinessSettings(input: {
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  workingDays: number[];
  dailyBookingLimit: number;
  maxOverbooking: number;
  maxCancellationsBeforeBlock: number;
}): BusinessSettings {
  const db = getDb();
  db.prepare(
    `
    UPDATE business_settings
    SET
      open_time = ?,
      close_time = ?,
      break_start = ?,
      break_end = ?,
      working_days = ?,
      daily_booking_limit = ?,
      max_overbooking = ?,
      max_cancellations_before_block = ?,
      updated_at = datetime('now')
    WHERE id = 1
    `,
  ).run(
    input.openTime,
    input.closeTime,
    input.breakStart,
    input.breakEnd,
    toWorkingDaysText(input.workingDays),
    input.dailyBookingLimit,
    input.maxOverbooking,
    input.maxCancellationsBeforeBlock,
  );

  return getBusinessSettings();
}

export function listClosedDays(filters: { startDate?: string; endDate?: string } = {}): ClosedDay[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: string[] = [];

  if (filters.startDate) {
    clauses.push("date >= ?");
    values.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push("date <= ?");
    values.push(filters.endDate);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `
      SELECT
        date,
        reason,
        strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS createdAt
      FROM closed_days
      ${where}
      ORDER BY date ASC
      `,
    )
    .all(...values) as ClosedDay[];
}

export function getDailyBookingLoad(localDate: string): { bookedCount: number; capacity: number } {
  const db = getDb();
  const settings = getBusinessSettings();
  const bounds = getUtcBoundsForLocalDay(localDate);
  const bookedCount = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          AND b.status IN ('pending', 'confirmed', 'cancel_requested')
        `,
      )
      .get(bounds.startUtc, bounds.endUtc) as { count: number }
  ).count;

  return {
    bookedCount,
    capacity: settings.dailyBookingLimit + settings.maxOverbooking,
  };
}

export function addClosedDay(input: { date: string; reason?: string | null }): ClosedDay {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO closed_days (date, reason)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET reason = excluded.reason
    `,
  ).run(input.date, input.reason?.trim() || null);

  const row = db
    .prepare(
      `
      SELECT
        date,
        reason,
        strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS createdAt
      FROM closed_days
      WHERE date = ?
      `,
    )
    .get(input.date) as ClosedDay | undefined;

  if (!row) {
    throw new Error("Closed day saved but not found.");
  }
  return row;
}

export function deleteClosedDay(date: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM closed_days WHERE date = ?").run(date).changes > 0;
}

export function listWaitlistEntries(filters: { status?: WaitlistStatus; date?: string } = {}): WaitlistEntry[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.status) {
    clauses.push("w.status = ?");
    values.push(filters.status);
  }
  if (filters.date) {
    clauses.push("w.preferred_date = ?");
    values.push(filters.date);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `
      SELECT
        w.id AS id,
        w.service_id AS serviceId,
        s.name AS serviceName,
        w.preferred_date AS preferredDate,
        w.preferred_time AS preferredTime,
        w.customer_name AS customerName,
        w.customer_phone AS customerPhone,
        w.customer_email AS customerEmail,
        w.notes AS notes,
        w.status AS status,
        strftime('%Y-%m-%dT%H:%M:%SZ', w.created_at) AS createdAt
      FROM waitlist_entries w
      INNER JOIN services s ON s.id = w.service_id
      ${where}
      ORDER BY w.preferred_date ASC, w.created_at ASC
      LIMIT 1000
      `,
    )
    .all(...values) as WaitlistEntry[];
}

export function createWaitlistEntry(input: {
  serviceId: number;
  preferredDate: string;
  preferredTime?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string | null;
}): WaitlistEntry {
  const db = getDb();
  const existing = db
    .prepare(
      `
      SELECT id
      FROM waitlist_entries
      WHERE service_id = ?
        AND preferred_date = ?
        AND lower(customer_email) = lower(?)
        AND status IN ('pending', 'contacted')
      ORDER BY id DESC
      LIMIT 1
      `,
    )
    .get(input.serviceId, input.preferredDate, input.customerEmail) as { id: number } | undefined;

  if (existing) {
    const row = db
      .prepare(
        `
        SELECT
          w.id AS id,
          w.service_id AS serviceId,
          s.name AS serviceName,
          w.preferred_date AS preferredDate,
          w.preferred_time AS preferredTime,
          w.customer_name AS customerName,
          w.customer_phone AS customerPhone,
          w.customer_email AS customerEmail,
          w.notes AS notes,
          w.status AS status,
          strftime('%Y-%m-%dT%H:%M:%SZ', w.created_at) AS createdAt
        FROM waitlist_entries w
        INNER JOIN services s ON s.id = w.service_id
        WHERE w.id = ?
        `,
      )
      .get(existing.id) as WaitlistEntry;

    return row;
  }

  const inserted = db
    .prepare(
      `
      INSERT INTO waitlist_entries
      (service_id, preferred_date, preferred_time, customer_name, customer_phone, customer_email, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
    )
    .run(
      input.serviceId,
      input.preferredDate,
      input.preferredTime ?? null,
      input.customerName.trim(),
      input.customerPhone.trim(),
      normalizeEmail(input.customerEmail),
      input.notes?.trim() || null,
    );

  const row = db
    .prepare(
      `
      SELECT
        w.id AS id,
        w.service_id AS serviceId,
        s.name AS serviceName,
        w.preferred_date AS preferredDate,
        w.preferred_time AS preferredTime,
        w.customer_name AS customerName,
        w.customer_phone AS customerPhone,
        w.customer_email AS customerEmail,
        w.notes AS notes,
        w.status AS status,
        strftime('%Y-%m-%dT%H:%M:%SZ', w.created_at) AS createdAt
      FROM waitlist_entries w
      INNER JOIN services s ON s.id = w.service_id
      WHERE w.id = ?
      `,
    )
    .get(Number(inserted.lastInsertRowid)) as WaitlistEntry | undefined;

  if (!row) {
    throw new Error("Waitlist entry created but not found.");
  }

  return row;
}

export function updateWaitlistStatus(id: number, status: WaitlistStatus): WaitlistEntry | null {
  const db = getDb();
  const updated = db.prepare("UPDATE waitlist_entries SET status = ? WHERE id = ?").run(status, id);
  if (updated.changes === 0) {
    return null;
  }
  const row = db
    .prepare(
      `
      SELECT
        w.id AS id,
        w.service_id AS serviceId,
        s.name AS serviceName,
        w.preferred_date AS preferredDate,
        w.preferred_time AS preferredTime,
        w.customer_name AS customerName,
        w.customer_phone AS customerPhone,
        w.customer_email AS customerEmail,
        w.notes AS notes,
        w.status AS status,
        strftime('%Y-%m-%dT%H:%M:%SZ', w.created_at) AS createdAt
      FROM waitlist_entries w
      INNER JOIN services s ON s.id = w.service_id
      WHERE w.id = ?
      `,
    )
    .get(id) as WaitlistEntry | undefined;
  return row ?? null;
}

export function getCustomerUserById(id: number): CustomerUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        google_id AS googleId,
        created_at AS createdAt
      FROM customer_users
      WHERE id = ?
      `,
    )
    .get(id) as
    | {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        passwordHash: string | null;
        googleId: string | null;
        createdAt: string;
      }
    | undefined;

  return row ? mapCustomerUser(row) : null;
}

export function getCustomerUserByEmail(email: string): CustomerUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        google_id AS googleId,
        created_at AS createdAt
      FROM customer_users
      WHERE email = ?
      `,
    )
    .get(normalizeEmail(email)) as
    | {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        passwordHash: string | null;
        googleId: string | null;
        createdAt: string;
      }
    | undefined;

  return row ? mapCustomerUser(row) : null;
}

export function createCustomerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
}): CustomerUser | null {
  const email = normalizeEmail(input.email);
  if (getCustomerUserByEmail(email)) {
    return null;
  }

  const db = getDb();
  const passwordHash = bcrypt.hashSync(input.password, 12);
  const result = db
    .prepare(
      `
      INSERT INTO customer_users (name, email, phone, password_hash)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(input.name.trim(), email, input.phone?.trim() || null, passwordHash);

  return getCustomerUserById(Number(result.lastInsertRowid));
}

export function verifyCustomerCredentials(email: string, password: string): CustomerUser | null {
  const user = getCustomerUserByEmail(email);
  if (!user || !user.passwordHash) {
    return null;
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  return valid ? user : null;
}

export function upsertGoogleCustomerUser(input: {
  email: string;
  name?: string | null;
  googleId?: string | null;
}): CustomerUser {
  const db = getDb();
  const normalizedEmail = normalizeEmail(input.email);

  const byGoogleId =
    input.googleId && input.googleId.trim()
      ? (db
          .prepare(
            `
            SELECT
              id,
              name,
              email,
              phone,
              password_hash AS passwordHash,
              google_id AS googleId,
              created_at AS createdAt
            FROM customer_users
            WHERE google_id = ?
            `,
          )
          .get(input.googleId.trim()) as
          | {
              id: number;
              name: string;
              email: string;
              phone: string | null;
              passwordHash: string | null;
              googleId: string | null;
              createdAt: string;
            }
          | undefined)
      : undefined;

  if (byGoogleId) {
    db.prepare("UPDATE customer_users SET email = ?, name = ? WHERE id = ?").run(
      normalizedEmail,
      input.name?.trim() || byGoogleId.name,
      byGoogleId.id,
    );
    return getCustomerUserById(byGoogleId.id) as CustomerUser;
  }

  const byEmail = getCustomerUserByEmail(normalizedEmail);
  if (byEmail) {
    db.prepare(
      `
      UPDATE customer_users
      SET
        name = ?,
        google_id = COALESCE(?, google_id)
      WHERE id = ?
      `,
    ).run(input.name?.trim() || byEmail.name, input.googleId?.trim() || null, byEmail.id);

    return getCustomerUserById(byEmail.id) as CustomerUser;
  }

  const result = db
    .prepare(
      `
      INSERT INTO customer_users (name, email, google_id)
      VALUES (?, ?, ?)
      `,
    )
    .run(input.name?.trim() || "Cliente", normalizedEmail, input.googleId?.trim() || null);

  return getCustomerUserById(Number(result.lastInsertRowid)) as CustomerUser;
}

export function listServices(options?: { includeInactive?: boolean }): Service[] {
  const includeInactive = options?.includeInactive ?? false;
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        id,
        name,
        duration_min AS durationMin,
        price_cents AS priceCents,
        is_active AS isActive
      FROM services
      ${includeInactive ? "" : "WHERE is_active = 1"}
      ORDER BY id ASC
      `,
    )
    .all() as {
    id: number;
    name: string;
    durationMin: number;
    priceCents: number;
    isActive: number;
  }[];

  return rows.map(mapService);
}

export function getServiceById(id: number): Service | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        id,
        name,
        duration_min AS durationMin,
        price_cents AS priceCents,
        is_active AS isActive
      FROM services
      WHERE id = ?
      `,
    )
    .get(id) as
    | {
        id: number;
        name: string;
        durationMin: number;
        priceCents: number;
        isActive: number;
      }
    | undefined;

  return row ? mapService(row) : null;
}

export function getSlotById(id: number): Slot | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.service_id AS serviceId,
        s.start_at AS startAt,
        s.end_at AS endAt,
        s.status AS status,
        s.created_at AS createdAt,
        sv.name AS serviceName
      FROM slots s
      INNER JOIN services sv ON sv.id = s.service_id
      WHERE s.id = ?
      `,
    )
    .get(id) as
    | {
        id: number;
        serviceId: number;
        startAt: string;
        endAt: string;
        status: SlotStatus;
        createdAt: string;
        serviceName: string;
      }
    | undefined;

  return row ? mapSlot(row) : null;
}

export function createService(input: {
  name: string;
  durationMin: number;
  priceCents: number;
  isActive?: boolean;
}): Service {
  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO services (name, duration_min, price_cents, is_active)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(input.name, input.durationMin, input.priceCents, input.isActive === false ? 0 : 1);

  return getServiceById(Number(result.lastInsertRowid)) as Service;
}

export function updateService(input: {
  id: number;
  name: string;
  durationMin: number;
  priceCents: number;
  isActive?: boolean;
}): Service | null {
  const db = getDb();
  db.prepare(
    `
      UPDATE services
      SET
        name = ?,
        duration_min = ?,
        price_cents = ?,
        is_active = ?
      WHERE id = ?
      `,
  ).run(input.name, input.durationMin, input.priceCents, input.isActive === false ? 0 : 1, input.id);

  return getServiceById(input.id);
}

export function deleteService(id: number): boolean {
  const db = getDb();
  const usedCount = db
    .prepare("SELECT COUNT(*) as count FROM slots WHERE service_id = ?")
    .get(id) as { count: number };

  if (usedCount.count > 0) {
    const res = db.prepare("UPDATE services SET is_active = 0 WHERE id = ?").run(id);
    return res.changes > 0;
  }

  const result = db.prepare("DELETE FROM services WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listOpenSlotsForServiceDate(params: {
  serviceId: number;
  startUtc: string;
  endUtc: string;
}): Slot[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        id,
        service_id AS serviceId,
        start_at AS startAt,
        end_at AS endAt,
        status,
        created_at AS createdAt
      FROM slots
      WHERE service_id = ?
        AND status = 'open'
        AND start_at >= ?
        AND start_at < ?
      ORDER BY start_at ASC
      `,
    )
    .all(params.serviceId, params.startUtc, params.endUtc) as {
    id: number;
    serviceId: number;
    startAt: string;
    endAt: string;
    status: SlotStatus;
    createdAt: string;
  }[];

  return rows.map(mapSlot);
}

export function listSlots(filters: { serviceId?: number; startUtc?: string; endUtc?: string } = {}): Slot[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: Array<number | string> = [];

  if (filters.serviceId) {
    clauses.push("s.service_id = ?");
    values.push(filters.serviceId);
  }
  if (filters.startUtc) {
    clauses.push("s.start_at >= ?");
    values.push(filters.startUtc);
  }
  if (filters.endUtc) {
    clauses.push("s.start_at < ?");
    values.push(filters.endUtc);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.service_id AS serviceId,
        s.start_at AS startAt,
        s.end_at AS endAt,
        s.status AS status,
        s.created_at AS createdAt,
        sv.name AS serviceName
      FROM slots s
      INNER JOIN services sv ON sv.id = s.service_id
      ${where}
      ORDER BY s.start_at ASC
      LIMIT 800
      `,
    )
    .all(...values) as {
    id: number;
    serviceId: number;
    serviceName: string;
    startAt: string;
    endAt: string;
    status: SlotStatus;
    createdAt: string;
  }[];

  return rows.map(mapSlot);
}

export function createSlot(input: {
  serviceId: number;
  startAt: string;
  endAt: string;
  status?: "open" | "blocked";
}): Slot {
  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO slots (service_id, start_at, end_at, status)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(input.serviceId, input.startAt, input.endAt, input.status ?? "open");

  const row = db
    .prepare(
      `
      SELECT
        id,
        service_id AS serviceId,
        start_at AS startAt,
        end_at AS endAt,
        status,
        created_at AS createdAt
      FROM slots
      WHERE id = ?
      `,
    )
    .get(Number(result.lastInsertRowid)) as {
    id: number;
    serviceId: number;
    startAt: string;
    endAt: string;
    status: SlotStatus;
    createdAt: string;
  };

  return mapSlot(row);
}

export function updateSlotStatus(id: number, status: "open" | "blocked"): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `
      UPDATE slots
      SET status = ?
      WHERE id = ?
      `,
    )
    .run(status, id);
  return result.changes > 0;
}

function hasActiveBookingStatus(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "cancel_requested" || status === "no_show";
}

export function deleteSlot(
  id: number,
  options: { force?: boolean } = {},
): {
  ok: boolean;
  deleted: boolean;
  hadBooking: boolean;
  removedBookingId?: number;
  removedBookingStatus?: BookingStatus;
  reason?: "not_found" | "has_active_booking";
} {
  const db = getDb();
  const tx = db.transaction((slotId: number, forceDelete: boolean) => {
    const slot = db.prepare("SELECT id FROM slots WHERE id = ?").get(slotId) as { id: number } | undefined;
    if (!slot) {
      return {
        ok: false,
        deleted: false,
        hadBooking: false,
        reason: "not_found" as const,
      };
    }

    const linkedBooking = db
      .prepare("SELECT id, status FROM bookings WHERE slot_id = ?")
      .get(slotId) as { id: number; status: BookingStatus } | undefined;

    if (linkedBooking && hasActiveBookingStatus(linkedBooking.status) && !forceDelete) {
      return {
        ok: false,
        deleted: false,
        hadBooking: true,
        removedBookingId: linkedBooking.id,
        removedBookingStatus: linkedBooking.status,
        reason: "has_active_booking" as const,
      };
    }

    if (linkedBooking) {
      db.prepare("DELETE FROM bookings WHERE id = ?").run(linkedBooking.id);
    }

    const deleted = db.prepare("DELETE FROM slots WHERE id = ?").run(slotId).changes > 0;
    return {
      ok: deleted,
      deleted,
      hadBooking: Boolean(linkedBooking),
      removedBookingId: linkedBooking?.id,
      removedBookingStatus: linkedBooking?.status,
      reason: deleted ? undefined : ("not_found" as const),
    };
  });

  return tx(id, options.force === true);
}

export function deleteSlotsByDay(params: {
  startUtc: string;
  endUtc: string;
  serviceId?: number;
  force?: boolean;
}): { deleted: number; keptWithBookings: number; removedBookings: number } {
  const db = getDb();
  const forceDelete = params.force === true;

  const tx = db.transaction(() => {
    const values: Array<number | string> = [params.startUtc, params.endUtc];
    if (params.serviceId) {
      values.push(params.serviceId);
    }

    const rows = db
      .prepare(
        `
        SELECT
          s.id AS slotId,
          b.id AS bookingId,
          b.status AS bookingStatus
        FROM slots s
        LEFT JOIN bookings b ON b.slot_id = s.id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          ${params.serviceId ? "AND s.service_id = ?" : ""}
        ORDER BY s.start_at ASC
        `,
      )
      .all(...values) as {
      slotId: number;
      bookingId: number | null;
      bookingStatus: BookingStatus | null;
    }[];

    const deleteBookingStatement = db.prepare("DELETE FROM bookings WHERE id = ?");
    const deleteSlotStatement = db.prepare("DELETE FROM slots WHERE id = ?");

    let deleted = 0;
    let keptWithBookings = 0;
    let removedBookings = 0;

    for (const row of rows) {
      if (row.bookingId && row.bookingStatus) {
        if (hasActiveBookingStatus(row.bookingStatus) && !forceDelete) {
          keptWithBookings += 1;
          continue;
        }

        deleteBookingStatement.run(row.bookingId);
        removedBookings += 1;
      }

      const result = deleteSlotStatement.run(row.slotId);
      if (result.changes > 0) {
        deleted += 1;
      }
    }

    return { deleted, keptWithBookings, removedBookings };
  });

  return tx();
}

export function createBooking(input: {
  slotId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string | null;
}): Booking {
  const db = getDb();
  const settings = getBusinessSettings();

  const tx = db.transaction((payload: typeof input) => {
    const slot = db.prepare("SELECT id, status, start_at as startAt FROM slots WHERE id = ?").get(payload.slotId) as
      | { id: number; status: SlotStatus; startAt: string }
      | undefined;
    if (!slot || slot.status !== "open") {
      throw new BookingConflictError();
    }

    const email = normalizeEmail(payload.customerEmail);
    const customer = db
      .prepare(
        `
        SELECT
          is_blacklisted as isBlacklisted,
          cancelled_count as cancelledCount
        FROM customer_users
        WHERE lower(email) = lower(?)
        LIMIT 1
        `,
      )
      .get(email) as { isBlacklisted: number; cancelledCount: number } | undefined;

    if (customer?.isBlacklisted === 1 || (customer?.cancelledCount ?? 0) >= settings.maxCancellationsBeforeBlock) {
      throw new CustomerBlockedError();
    }

    const bookingLocalDay = isoToLocalDate(slot.startAt);
    const bounds = getUtcBoundsForLocalDay(bookingLocalDay);
    const dailyCount = (
      db
        .prepare(
          `
          SELECT COUNT(*) as count
          FROM bookings b
          INNER JOIN slots s ON s.id = b.slot_id
          WHERE s.start_at >= ?
            AND s.start_at < ?
            AND b.status IN ('pending', 'confirmed', 'cancel_requested')
          `,
        )
        .get(bounds.startUtc, bounds.endUtc) as { count: number }
    ).count;

    if (dailyCount >= settings.dailyBookingLimit + settings.maxOverbooking) {
      throw new DailyLimitExceededError();
    }

    const inserted = db
      .prepare(
        `
      INSERT INTO bookings (slot_id, customer_name, customer_phone, customer_email, notes, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
      `,
      )
      .run(
        payload.slotId,
        payload.customerName,
        payload.customerPhone,
        email,
        payload.notes ?? null,
      );

    db.prepare("UPDATE slots SET status = 'booked' WHERE id = ?").run(payload.slotId);

    const bookingId = Number(inserted.lastInsertRowid);
    const createdBooking = db
      .prepare(
        `
        SELECT
          b.id AS id,
          b.slot_id AS slotId,
          b.customer_name AS customerName,
          b.customer_phone AS customerPhone,
          b.customer_email AS customerEmail,
          b.notes AS notes,
          b.status AS status,
          b.created_at AS createdAt,
          s.start_at AS startAt,
          s.end_at AS endAt,
          s.service_id AS serviceId,
          sv.name AS serviceName
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        INNER JOIN services sv ON sv.id = s.service_id
        WHERE b.id = ?
        `,
      )
      .get(bookingId) as Booking | undefined;

    if (!createdBooking) {
      throw new Error("Booking created but not found.");
    }

    return createdBooking;
  });

  return tx(input);
}

export function listBookings(filters: {
  serviceId?: number;
  startUtc?: string;
  endUtc?: string;
  status?: BookingStatus;
  query?: string;
} = {}): Booking[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: Array<number | string> = [];

  if (filters.serviceId) {
    clauses.push("s.service_id = ?");
    values.push(filters.serviceId);
  }
  if (filters.startUtc) {
    clauses.push("s.start_at >= ?");
    values.push(filters.startUtc);
  }
  if (filters.endUtc) {
    clauses.push("s.start_at < ?");
    values.push(filters.endUtc);
  }
  if (filters.status) {
    clauses.push("b.status = ?");
    values.push(filters.status);
  }
  if (filters.query && filters.query.trim()) {
    clauses.push("(lower(b.customer_name) LIKE ? OR lower(coalesce(b.customer_email, '')) LIKE ? OR lower(b.customer_phone) LIKE ?)");
    const q = `%${filters.query.trim().toLowerCase()}%`;
    values.push(q, q, q);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
      SELECT
        b.id AS id,
        b.slot_id AS slotId,
        b.customer_name AS customerName,
        b.customer_phone AS customerPhone,
        b.customer_email AS customerEmail,
        b.notes AS notes,
        b.status AS status,
        b.created_at AS createdAt,
        s.start_at AS startAt,
        s.end_at AS endAt,
        s.service_id AS serviceId,
        sv.name AS serviceName
      FROM bookings b
      INNER JOIN slots s ON s.id = b.slot_id
      INNER JOIN services sv ON sv.id = s.service_id
      ${where}
      ORDER BY s.start_at DESC
      LIMIT 1000
      `,
    )
    .all(...values) as Booking[];

  return rows;
}

export function listBookingsByCustomerEmail(email: string): Booking[] {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const rows = db
    .prepare(
      `
      SELECT
        b.id AS id,
        b.slot_id AS slotId,
        b.customer_name AS customerName,
        b.customer_phone AS customerPhone,
        b.customer_email AS customerEmail,
        b.notes AS notes,
        b.status AS status,
        b.created_at AS createdAt,
        s.start_at AS startAt,
        s.end_at AS endAt,
        s.service_id AS serviceId,
        sv.name AS serviceName
      FROM bookings b
      INNER JOIN slots s ON s.id = b.slot_id
      INNER JOIN services sv ON sv.id = s.service_id
      WHERE lower(coalesce(b.customer_email, '')) = ?
      ORDER BY s.start_at DESC
      LIMIT 500
      `,
    )
    .all(normalizedEmail) as Booking[];

  return rows;
}

export function listCustomerAccounts(filters: {
  query?: string;
  provider?: "email" | "google" | "email+google";
} = {}): CustomerAccountSummary[] {
  const db = getDb();
  const clauses: string[] = [];
  const values: string[] = [];

  if (filters.query && filters.query.trim()) {
    const q = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push("(lower(cu.name) LIKE ? OR lower(cu.email) LIKE ? OR lower(coalesce(cu.phone, '')) LIKE ?)");
    values.push(q, q, q);
  }

  if (filters.provider === "email") {
    clauses.push("cu.password_hash IS NOT NULL AND cu.google_id IS NULL");
  } else if (filters.provider === "google") {
    clauses.push("cu.password_hash IS NULL AND cu.google_id IS NOT NULL");
  } else if (filters.provider === "email+google") {
    clauses.push("cu.password_hash IS NOT NULL AND cu.google_id IS NOT NULL");
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
      SELECT
        cu.id AS id,
        cu.name AS name,
        cu.email AS email,
        cu.phone AS phone,
        cu.internal_notes AS internalNotes,
        cu.is_vip AS isVip,
        cu.is_blacklisted AS isBlacklisted,
        cu.cancelled_count AS cancelledCount,
        CASE WHEN cu.password_hash IS NOT NULL THEN 1 ELSE 0 END AS hasPassword,
        CASE WHEN cu.google_id IS NOT NULL THEN 1 ELSE 0 END AS hasGoogle,
        strftime('%Y-%m-%dT%H:%M:%SZ', cu.created_at) AS createdAt,
        (
          SELECT COUNT(*)
          FROM bookings b
          WHERE lower(coalesce(b.customer_email, '')) = lower(cu.email)
        ) AS bookingCount,
        (
          SELECT s.start_at
          FROM bookings b
          INNER JOIN slots s ON s.id = b.slot_id
          WHERE lower(coalesce(b.customer_email, '')) = lower(cu.email)
          ORDER BY s.start_at DESC
          LIMIT 1
        ) AS lastBookingAt,
        (
          SELECT b.status
          FROM bookings b
          INNER JOIN slots s ON s.id = b.slot_id
          WHERE lower(coalesce(b.customer_email, '')) = lower(cu.email)
          ORDER BY s.start_at DESC
          LIMIT 1
        ) AS lastBookingStatus
      FROM customer_users cu
      ${where}
      ORDER BY cu.created_at DESC
      LIMIT 1000
      `,
    )
    .all(...values) as {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    internalNotes: string | null;
    isVip: number;
    isBlacklisted: number;
    cancelledCount: number;
    hasPassword: number;
    hasGoogle: number;
    createdAt: string;
    bookingCount: number;
    lastBookingAt: string | null;
    lastBookingStatus: BookingStatus | null;
  }[];

  return rows.map((row) => {
    let authProvider: CustomerAccountSummary["authProvider"] = "email";
    if (row.hasGoogle === 1 && row.hasPassword === 1) {
      authProvider = "email+google";
    } else if (row.hasGoogle === 1) {
      authProvider = "google";
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      internalNotes: row.internalNotes,
      isVip: row.isVip === 1,
      isBlacklisted: row.isBlacklisted === 1,
      cancelledCount: row.cancelledCount,
      authProvider,
      createdAt: row.createdAt,
      bookingCount: row.bookingCount,
      lastBookingAt: row.lastBookingAt,
      lastBookingStatus: row.lastBookingStatus,
    };
  });
}

export function updateCustomerAccountMeta(input: {
  id: number;
  isVip: boolean;
  isBlacklisted: boolean;
  internalNotes?: string | null;
}): CustomerAccountSummary | null {
  const db = getDb();
  const updated = db
    .prepare(
      `
      UPDATE customer_users
      SET
        is_vip = ?,
        is_blacklisted = ?,
        internal_notes = ?
      WHERE id = ?
      `,
    )
    .run(input.isVip ? 1 : 0, input.isBlacklisted ? 1 : 0, input.internalNotes?.trim() || null, input.id);

  if (updated.changes === 0) {
    return null;
  }

  const account = listCustomerAccounts().find((item) => item.id === input.id) ?? null;
  return account;
}

export function requestBookingCancellationByCustomer(
  bookingId: number,
  customerEmail: string,
): { booking: Booking | null; reason?: "not_found" | "not_confirmed" | "already_requested" | "already_cancelled" } {
  const db = getDb();
  const normalizedEmail = normalizeEmail(customerEmail);

  const tx = db.transaction((id: number) => {
    const booking = db
      .prepare(
        `
        SELECT
          id,
          status,
          lower(coalesce(customer_email, '')) AS customerEmailLower
        FROM bookings
        WHERE id = ?
        `,
      )
      .get(id) as { id: number; status: BookingStatus; customerEmailLower: string } | undefined;

    if (!booking || booking.customerEmailLower !== normalizedEmail) {
      return { booking: null, reason: "not_found" as const };
    }

    if (booking.status === "cancelled") {
      return { booking: null, reason: "already_cancelled" as const };
    }

    if (booking.status === "cancel_requested") {
      return { booking: null, reason: "already_requested" as const };
    }

    if (booking.status !== "confirmed") {
      return { booking: null, reason: "not_confirmed" as const };
    }

    db.prepare("UPDATE bookings SET status = 'cancel_requested' WHERE id = ?").run(id);

    return { booking: getBookingById(id), reason: undefined };
  });

  return tx(bookingId);
}

export function getBookingById(bookingId: number): Booking | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        b.id AS id,
        b.slot_id AS slotId,
        b.customer_name AS customerName,
        b.customer_phone AS customerPhone,
        b.customer_email AS customerEmail,
        b.notes AS notes,
        b.status AS status,
        b.created_at AS createdAt,
        s.start_at AS startAt,
        s.end_at AS endAt,
        s.service_id AS serviceId,
        sv.name AS serviceName
      FROM bookings b
      INNER JOIN slots s ON s.id = b.slot_id
      INNER JOIN services sv ON sv.id = s.service_id
      WHERE b.id = ?
      `,
    )
    .get(bookingId) as Booking | undefined;

  return row ?? null;
}

export function confirmBooking(bookingId: number): Booking | null {
  const db = getDb();

  const tx = db.transaction((id: number) => {
    const booking = db
      .prepare("SELECT id, status FROM bookings WHERE id = ?")
      .get(id) as { id: number; status: BookingStatus } | undefined;

    if (!booking) {
      return null;
    }

    if (booking.status === "cancelled") {
      return null;
    }

    if (booking.status !== "confirmed") {
      db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(id);
    }

    return getBookingById(id);
  });

  return tx(bookingId);
}

export function rejectBookingCancellationRequest(bookingId: number): Booking | null {
  const db = getDb();

  const tx = db.transaction((id: number) => {
    const booking = db
      .prepare("SELECT id, status FROM bookings WHERE id = ?")
      .get(id) as { id: number; status: BookingStatus } | undefined;

    if (!booking || booking.status !== "cancel_requested") {
      return null;
    }

    db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(id);
    return getBookingById(id);
  });

  return tx(bookingId);
}

export function markBookingNoShow(bookingId: number): Booking | null {
  const db = getDb();
  const tx = db.transaction((id: number) => {
    const booking = db
      .prepare("SELECT id, status FROM bookings WHERE id = ?")
      .get(id) as { id: number; status: BookingStatus } | undefined;

    if (!booking) {
      return null;
    }
    if (booking.status === "cancelled") {
      return null;
    }

    db.prepare("UPDATE bookings SET status = 'no_show' WHERE id = ?").run(id);
    return getBookingById(id);
  });

  return tx(bookingId);
}

export function cancelBooking(bookingId: number): Booking | null {
  const db = getDb();

  const tx = db.transaction((id: number) => {
    const booking = db
      .prepare("SELECT id, slot_id as slotId, status, customer_email as customerEmail FROM bookings WHERE id = ?")
      .get(id) as { id: number; slotId: number; status: BookingStatus; customerEmail: string | null } | undefined;

    if (!booking) {
      return null;
    }

    if (booking.status !== "cancelled") {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
      db.prepare("UPDATE slots SET status = 'open' WHERE id = ? AND status = 'booked'").run(booking.slotId);
      if (booking.customerEmail) {
        db.prepare(
          `
          UPDATE customer_users
          SET cancelled_count = coalesce(cancelled_count, 0) + 1
          WHERE lower(email) = lower(?)
          `,
        ).run(booking.customerEmail);
      }
    }

    return getBookingById(id);
  });

  return tx(bookingId);
}

export function verifyAdminCredentials(username: string, password: string): { id: number; username: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, password_hash as passwordHash FROM admin_users WHERE username = ?")
    .get(username) as { id: number; username: string; passwordHash: string } | undefined;

  if (!row) {
    return null;
  }

  const valid = bcrypt.compareSync(password, row.passwordHash);
  if (!valid) {
    return null;
  }

  return { id: row.id, username: row.username };
}

export function getBusinessKpis(): {
  monthRevenueCents: number;
  occupancyRate: number;
  noShowRate: number;
  recurringCustomers: number;
  waitlistPending: number;
} {
  const db = getDb();
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();
  const nextMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString();

  const monthRevenueCents = (
    db
      .prepare(
        `
        SELECT coalesce(SUM(sv.price_cents), 0) as total
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        INNER JOIN services sv ON sv.id = s.service_id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          AND b.status = 'confirmed'
        `,
      )
      .get(monthStart, nextMonthStart) as { total: number }
  ).total;

  const totalSlots = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM slots
        WHERE start_at >= ?
          AND start_at < ?
        `,
      )
      .get(monthStart, nextMonthStart) as { count: number }
  ).count;

  const occupiedSlots = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          AND b.status IN ('pending', 'confirmed', 'cancel_requested', 'no_show')
        `,
      )
      .get(monthStart, nextMonthStart) as { count: number }
  ).count;

  const completedOrMissed = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          AND b.status IN ('confirmed', 'no_show')
        `,
      )
      .get(monthStart, nextMonthStart) as { count: number }
  ).count;

  const noShows = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN slots s ON s.id = b.slot_id
        WHERE s.start_at >= ?
          AND s.start_at < ?
          AND b.status = 'no_show'
        `,
      )
      .get(monthStart, nextMonthStart) as { count: number }
  ).count;

  const recurringCustomers = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM (
          SELECT lower(coalesce(customer_email, '')) as email_key, COUNT(*) as c
          FROM bookings
          WHERE customer_email IS NOT NULL
            AND status IN ('pending', 'confirmed', 'cancel_requested', 'no_show')
          GROUP BY lower(customer_email)
          HAVING COUNT(*) >= 2
        ) t
        `,
      )
      .get() as { count: number }
  ).count;

  const waitlistPending = (
    db.prepare("SELECT COUNT(*) as count FROM waitlist_entries WHERE status = 'pending'").get() as { count: number }
  ).count;

  const occupancyRate = totalSlots === 0 ? 0 : occupiedSlots / totalSlots;
  const noShowRate = completedOrMissed === 0 ? 0 : noShows / completedOrMissed;

  return {
    monthRevenueCents,
    occupancyRate,
    noShowRate,
    recurringCustomers,
    waitlistPending,
  };
}

export function getDashboardStats(): {
  serviceCount: number;
  openSlots: number;
  pendingBookings: number;
  cancelRequestedBookings: number;
  confirmedBookings: number;
  noShowBookings: number;
  totalBookings: number;
} {
  const db = getDb();
  const serviceCount = (db.prepare("SELECT COUNT(*) as count FROM services WHERE is_active = 1").get() as {
    count: number;
  }).count;
  const openSlots = (db.prepare("SELECT COUNT(*) as count FROM slots WHERE status = 'open'").get() as {
    count: number;
  }).count;
  const pendingBookings = (db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get() as {
    count: number;
  }).count;
  const cancelRequestedBookings = (
    db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancel_requested'").get() as {
      count: number;
    }
  ).count;
  const confirmedBookings = (
    db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get() as {
      count: number;
    }
  ).count;
  const noShowBookings = (db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'no_show'").get() as {
    count: number;
  }).count;
  const totalBookings = (db.prepare("SELECT COUNT(*) as count FROM bookings").get() as { count: number }).count;

  return { serviceCount, openSlots, pendingBookings, cancelRequestedBookings, confirmedBookings, noShowBookings, totalBookings };
}

export { BookingConflictError, CustomerBlockedError, DailyLimitExceededError };
