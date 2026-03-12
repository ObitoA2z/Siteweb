import nodemailer from "nodemailer";

import { env } from "@/lib/env";
import {
  claimDueOutboxEmails,
  enqueueEmail,
  markOutboxEmailFailed,
  markOutboxEmailSent,
  requeueStuckSendingEmails,
} from "@/lib/emailOutbox";
import { formatDateTime } from "@/lib/time";

/** Échappe les caractères HTML pour éviter l'injection dans les emails HTML. */
function escHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type BookingMailPayload = {
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string | null;
  serviceName: string;
  startAt: string;
};

type PasswordResetMailPayload = {
  customerName: string;
  customerEmail: string;
  resetUrl: string;
};

type EmailVerificationMailPayload = {
  customerName: string;
  customerEmail: string;
  verifyUrl: string;
};

export type MailResult = { queued: true; outboxId: number } | { queued: false; reason: string };

let cachedTransporter: nodemailer.Transporter | null = null;
let processingOutbox = false;

function canSendEmails(): boolean {
  return Boolean(env.MAIL_FROM && env.SMTP_HOST);
}

function getTransporter(): nodemailer.Transporter | null {
  if (!canSendEmails()) {
    return null;
  }

  if (!cachedTransporter) {
    const transportConfig: {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
    } = {
      host: env.SMTP_HOST as string,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
    };

    if (env.SMTP_USER && env.SMTP_PASS) {
      transportConfig.auth = {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      };
    }

    cachedTransporter = nodemailer.createTransport(transportConfig);
  }

  return cachedTransporter;
}

async function sendMailNow(payload: MailPayload): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (MAIL_FROM and SMTP_HOST are required).");
  }

  await transporter.sendMail({
    from: env.MAIL_FROM as string,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

async function processOutboxBatch(limit = 10): Promise<void> {
  // Remettre en file les emails bloqués en 'sending' depuis plus de 10 min (worker crash)
  requeueStuckSendingEmails(10);

  const batch = claimDueOutboxEmails(limit);

  for (const item of batch) {
    try {
      await sendMailNow({
        to: item.recipient,
        subject: item.subject,
        text: item.textBody,
        html: item.htmlBody,
      });
      markOutboxEmailSent(item.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      markOutboxEmailFailed(item.id, reason);
    }
  }
}

export async function processEmailOutbox(limit = 10): Promise<void> {
  if (processingOutbox) {
    return;
  }

  processingOutbox = true;
  try {
    await processOutboxBatch(limit);
  } finally {
    processingOutbox = false;
  }
}

async function queueMail(payload: MailPayload, category: string): Promise<MailResult> {
  try {
    const outboxId = enqueueEmail({
      recipient: payload.to,
      subject: payload.subject,
      textBody: payload.text,
      htmlBody: payload.html,
      category,
    });
    await processEmailOutbox(10);
    return { queued: true, outboxId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { queued: false, reason };
  }
}

export async function sendBookingPendingEmail(payload: BookingMailPayload): Promise<MailResult> {
  const appointment = formatDateTime(payload.startAt);
  const subject = "Confirmation de reception de votre demande de reservation";
  const text = [
    `Bonjour ${payload.customerName},`,
    "",
    "Nous avons bien recu votre demande de reservation. Ceci est un email de confirmation de reception.",
    `Prestation: ${payload.serviceName}`,
    `Creneau: ${appointment}`,
    `Numero: #${payload.bookingId}`,
    "",
    "Votre demande est en attente de validation par l'admin.",
    "Un second email vous sera envoye des que la reservation est confirmee.",
  ].join("\n");

  const html = `
    <p>Bonjour ${escHtml(payload.customerName)},</p>
    <p>Nous avons bien recu votre demande de reservation. Ceci est un email de confirmation de reception.</p>
    <ul>
      <li><strong>Prestation:</strong> ${escHtml(payload.serviceName)}</li>
      <li><strong>Creneau:</strong> ${escHtml(appointment)}</li>
      <li><strong>Numero:</strong> #${payload.bookingId}</li>
    </ul>
    <p>Votre demande est <strong>en attente de validation</strong> par l'admin.</p>
    <p>Un second email vous sera envoye des que la reservation est confirmee.</p>
  `;

  return queueMail({ to: payload.customerEmail, subject, text, html }, "booking_pending_customer");
}

export async function sendBookingConfirmedEmail(payload: BookingMailPayload): Promise<MailResult> {
  const appointment = formatDateTime(payload.startAt);
  const subject = "Votre reservation est confirmee";
  const text = [
    `Bonjour ${payload.customerName},`,
    "",
    "Bonne nouvelle: votre reservation a ete confirmee.",
    `Prestation: ${payload.serviceName}`,
    `Creneau: ${appointment}`,
    `Numero: #${payload.bookingId}`,
    "",
    "A bientot.",
  ].join("\n");

  const html = `
    <p>Bonjour ${escHtml(payload.customerName)},</p>
    <p>Bonne nouvelle: votre reservation a ete <strong>confirmee</strong>.</p>
    <ul>
      <li><strong>Prestation:</strong> ${escHtml(payload.serviceName)}</li>
      <li><strong>Creneau:</strong> ${escHtml(appointment)}</li>
      <li><strong>Numero:</strong> #${payload.bookingId}</li>
    </ul>
    <p>A bientot.</p>
  `;

  return queueMail({ to: payload.customerEmail, subject, text, html }, "booking_confirmed_customer");
}

export async function sendAdminNewBookingRequestEmail(payload: BookingMailPayload): Promise<MailResult> {
  if (!env.ADMIN_NOTIFICATION_EMAIL) {
    return { queued: false, reason: "ADMIN_NOTIFICATION_EMAIL is not configured." };
  }

  const appointment = formatDateTime(payload.startAt);
  const subject = `Nouvelle demande de reservation #${payload.bookingId}`;
  const text = [
    "Nouvelle demande de reservation en attente.",
    `Numero: #${payload.bookingId}`,
    `Cliente: ${payload.customerName}`,
    `Email cliente: ${payload.customerEmail}`,
    `Telephone cliente: ${payload.customerPhone ?? "-"}`,
    `Prestation: ${payload.serviceName}`,
    `Creneau: ${appointment}`,
    payload.notes ? `Notes: ${payload.notes}` : "Notes: -",
  ].join("\n");

  const html = `
    <p><strong>Nouvelle demande de reservation en attente.</strong></p>
    <ul>
      <li><strong>Numero:</strong> #${payload.bookingId}</li>
      <li><strong>Cliente:</strong> ${escHtml(payload.customerName)}</li>
      <li><strong>Email cliente:</strong> ${escHtml(payload.customerEmail)}</li>
      <li><strong>Telephone cliente:</strong> ${escHtml(payload.customerPhone ?? "-")}</li>
      <li><strong>Prestation:</strong> ${escHtml(payload.serviceName)}</li>
      <li><strong>Creneau:</strong> ${escHtml(appointment)}</li>
      <li><strong>Notes:</strong> ${escHtml(payload.notes ?? "-")}</li>
    </ul>
  `;

  return queueMail({ to: env.ADMIN_NOTIFICATION_EMAIL, subject, text, html }, "booking_pending_admin");
}

export async function sendPasswordResetEmail(payload: PasswordResetMailPayload): Promise<MailResult> {
  const subject = "Reinitialisation de votre mot de passe";
  const text = [
    `Bonjour ${payload.customerName},`,
    "",
    "Une demande de reinitialisation de mot de passe a ete recue.",
    "Si vous etes a l'origine de cette demande, utilisez ce lien:",
    payload.resetUrl,
    "",
    "Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.",
  ].join("\n");

  const html = `
    <p>Bonjour ${payload.customerName},</p>
    <p>Une demande de reinitialisation de mot de passe a ete recue.</p>
    <p>Si vous etes a l'origine de cette demande, cliquez sur ce lien:</p>
    <p><a href="${payload.resetUrl}">${payload.resetUrl}</a></p>
    <p>Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.</p>
  `;

  return queueMail({ to: payload.customerEmail, subject, text, html }, "password_reset_customer");
}

export async function sendEmailVerificationEmail(payload: EmailVerificationMailPayload): Promise<MailResult> {
  const subject = "Verification de votre adresse email";
  const text = [
    `Bonjour ${payload.customerName},`,
    "",
    "Merci pour votre inscription. Verifiez votre adresse email en ouvrant ce lien:",
    payload.verifyUrl,
    "",
    "Ce lien expire dans 24 heures.",
  ].join("\n");

  const html = `
    <p>Bonjour ${payload.customerName},</p>
    <p>Merci pour votre inscription. Verifiez votre adresse email en ouvrant ce lien:</p>
    <p><a href="${payload.verifyUrl}">${payload.verifyUrl}</a></p>
    <p>Ce lien expire dans 24 heures.</p>
  `;

  return queueMail({ to: payload.customerEmail, subject, text, html }, "email_verification_customer");
}
