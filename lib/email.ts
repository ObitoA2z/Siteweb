import nodemailer from "nodemailer";

import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/time";

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

let cachedTransporter: nodemailer.Transporter | null = null;

function canSendEmails(): boolean {
  return Boolean(env.MAIL_FROM && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter(): nodemailer.Transporter | null {
  if (!canSendEmails()) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST as string,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER as string,
        pass: env.SMTP_PASS as string,
      },
    });
  }

  return cachedTransporter;
}

async function sendMail(payload: MailPayload): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mail] disabled. Configure SMTP_* and MAIL_FROM to send emails.");
    return;
  }

  try {
    await transporter.sendMail({
      from: env.MAIL_FROM as string,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    console.error("[mail] send failed", error);
  }
}

export async function sendBookingPendingEmail(payload: BookingMailPayload): Promise<void> {
  const appointment = formatDateTime(payload.startAt);
  const subject = "Votre reservation est en attente de confirmation";
  const text = [
    `Bonjour ${payload.customerName},`,
    "",
    "Nous avons bien recu votre demande de reservation.",
    `Prestation: ${payload.serviceName}`,
    `Creneau: ${appointment}`,
    `Numero: #${payload.bookingId}`,
    "",
    "Votre demande est en attente de validation par l'admin.",
  ].join("\n");

  const html = `
    <p>Bonjour ${payload.customerName},</p>
    <p>Nous avons bien recu votre demande de reservation.</p>
    <ul>
      <li><strong>Prestation:</strong> ${payload.serviceName}</li>
      <li><strong>Creneau:</strong> ${appointment}</li>
      <li><strong>Numero:</strong> #${payload.bookingId}</li>
    </ul>
    <p>Votre demande est <strong>en attente de validation</strong> par l'admin.</p>
  `;

  await sendMail({
    to: payload.customerEmail,
    subject,
    text,
    html,
  });
}

export async function sendBookingConfirmedEmail(payload: BookingMailPayload): Promise<void> {
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
    <p>Bonjour ${payload.customerName},</p>
    <p>Bonne nouvelle: votre reservation a ete <strong>confirmee</strong>.</p>
    <ul>
      <li><strong>Prestation:</strong> ${payload.serviceName}</li>
      <li><strong>Creneau:</strong> ${appointment}</li>
      <li><strong>Numero:</strong> #${payload.bookingId}</li>
    </ul>
    <p>A bientot.</p>
  `;

  await sendMail({
    to: payload.customerEmail,
    subject,
    text,
    html,
  });
}

export async function sendAdminNewBookingRequestEmail(payload: BookingMailPayload): Promise<void> {
  if (!env.ADMIN_NOTIFICATION_EMAIL) {
    return;
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
      <li><strong>Cliente:</strong> ${payload.customerName}</li>
      <li><strong>Email cliente:</strong> ${payload.customerEmail}</li>
      <li><strong>Telephone cliente:</strong> ${payload.customerPhone ?? "-"}</li>
      <li><strong>Prestation:</strong> ${payload.serviceName}</li>
      <li><strong>Creneau:</strong> ${appointment}</li>
      <li><strong>Notes:</strong> ${payload.notes || "-"}</li>
    </ul>
  `;

  await sendMail({
    to: env.ADMIN_NOTIFICATION_EMAIL,
    subject,
    text,
    html,
  });
}
