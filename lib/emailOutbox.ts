import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import type { EmailOutboxItem, EmailOutboxStatus, EmailOutboxPage } from "@/lib/types";

type OutboxListFilters = {
  status?: EmailOutboxStatus;
  page?: number;
  pageSize?: number;
};

function mapOutboxRows(rows: unknown[]): EmailOutboxItem[] {
  return rows as EmailOutboxItem[];
}

export function enqueueEmail(input: {
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  category?: string;
  maxAttempts?: number;
}): number {
  const db = getDb();
  const inserted = db
    .prepare(
      `
      INSERT INTO email_outbox
      (category, recipient, subject, text_body, html_body, status, attempt_count, max_attempts, next_attempt_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, datetime('now'))
      `,
    )
    .run(
      input.category ?? "transactional",
      input.recipient.trim(),
      input.subject.trim(),
      input.textBody,
      input.htmlBody,
      Math.max(1, input.maxAttempts ?? env.EMAIL_OUTBOX_MAX_ATTEMPTS),
    );

  return Number(inserted.lastInsertRowid);
}

export function claimDueOutboxEmails(limit = 10): EmailOutboxItem[] {
  const db = getDb();
  const tx = db.transaction((batchSize: number) => {
    const rows = db
      .prepare(
        `
        SELECT
          id,
          category,
          recipient,
          subject,
          text_body AS textBody,
          html_body AS htmlBody,
          status,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          last_error AS lastError,
          next_attempt_at AS nextAttemptAt,
          locked_at AS lockedAt,
          sent_at AS sentAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM email_outbox
        WHERE status IN ('pending', 'retry')
          AND datetime(next_attempt_at) <= datetime('now')
        ORDER BY id ASC
        LIMIT ?
        `,
      )
      .all(Math.max(1, batchSize));

    const items = mapOutboxRows(rows);
    for (const item of items) {
      db.prepare(
        `
        UPDATE email_outbox
        SET status = 'sending', locked_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
        `,
      ).run(item.id);
    }

    return items;
  });

  return tx.immediate(limit);
}

export function markOutboxEmailSent(id: number): void {
  const db = getDb();
  db.prepare(
    `
    UPDATE email_outbox
    SET
      status = 'sent',
      sent_at = datetime('now'),
      locked_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
    `,
  ).run(id);
}

export function markOutboxEmailFailed(id: number, errorMessage: string): void {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT attempt_count AS attemptCount, max_attempts AS maxAttempts
      FROM email_outbox
      WHERE id = ?
      `,
    )
    .get(id) as { attemptCount: number; maxAttempts: number } | undefined;

  if (!row) {
    return;
  }

  const nextAttemptCount = row.attemptCount + 1;
  const reachedMaxAttempts = nextAttemptCount >= row.maxAttempts;
  const delaySeconds = Math.min(60 * 30, 30 * 2 ** Math.max(0, nextAttemptCount - 1));

  if (reachedMaxAttempts) {
    db.prepare(
      `
      UPDATE email_outbox
      SET
        status = 'failed',
        attempt_count = ?,
        last_error = ?,
        locked_at = NULL,
        updated_at = datetime('now')
      WHERE id = ?
      `,
    ).run(nextAttemptCount, errorMessage.slice(0, 2000), id);
    return;
  }

  db.prepare(
    `
    UPDATE email_outbox
    SET
      status = 'retry',
      attempt_count = ?,
      last_error = ?,
      next_attempt_at = datetime('now', ?),
      locked_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
    `,
  ).run(nextAttemptCount, errorMessage.slice(0, 2000), `+${delaySeconds} seconds`, id);
}

/**
 * Remet en file les emails bloqués en statut 'sending' depuis plus de LEASE_MINUTES.
 * Cas : worker crashé ou redémarré avant de marquer l'email sent/failed.
 */
export function requeueStuckSendingEmails(leaseMinutes = 10): number {
  const db = getDb();
  const result = db
    .prepare(
      `
      UPDATE email_outbox
      SET
        status = 'retry',
        locked_at = NULL,
        next_attempt_at = datetime('now'),
        updated_at = datetime('now')
      WHERE status = 'sending'
        AND datetime(locked_at) <= datetime('now', ?)
      `,
    )
    .run(`-${leaseMinutes} minutes`);
  return result.changes;
}

export function retryOutboxEmail(id: number): boolean {
  const db = getDb();
  const updated = db.prepare(
    `
    UPDATE email_outbox
    SET
      status = 'pending',
      next_attempt_at = datetime('now'),
      locked_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
      AND status IN ('failed', 'retry', 'sending')
    `,
  ).run(id);
  return updated.changes > 0;
}

export function listOutboxEmails(filters: OutboxListFilters = {}): EmailOutboxPage {
  const db = getDb();
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * pageSize;

  const whereClause = filters.status ? "WHERE status = ?" : "";
  const values = filters.status ? [filters.status] : [];

  const items = mapOutboxRows(
    db
      .prepare(
        `
        SELECT
          id,
          category,
          recipient,
          subject,
          text_body AS textBody,
          html_body AS htmlBody,
          status,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          last_error AS lastError,
          next_attempt_at AS nextAttemptAt,
          locked_at AS lockedAt,
          sent_at AS sentAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM email_outbox
        ${whereClause}
        ORDER BY id DESC
        LIMIT ?
        OFFSET ?
        `,
      )
      .all(...values, pageSize, offset),
  );

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS count FROM email_outbox ${whereClause}`)
      .get(...values) as { count: number }
  ).count;

  return {
    items,
    total,
    page,
    pageSize,
  };
}
