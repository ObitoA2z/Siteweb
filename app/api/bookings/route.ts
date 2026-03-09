import { NextRequest, NextResponse } from "next/server";

import {
  addAuditLog,
  BookingConflictError,
  createBooking,
  createWaitlistEntry,
  CustomerBlockedError,
  DailyLimitExceededError,
  getSlotById,
} from "@/lib/db";
import { sendAdminNewBookingRequestEmail, sendBookingPendingEmail } from "@/lib/email";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { formatTime, isoToLocalDate } from "@/lib/time";
import { bookingCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }
  const bodySizeGuard = requireBodySize(request, 16 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }
  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const ip = getClientIp(request);
  const minuteRate = checkRateLimit(`book:min:${ip}`, 5, 60_000);
  if (!minuteRate.ok) {
    return NextResponse.json({ error: "Trop de tentatives. Reessaie dans 1 minute." }, { status: 429 });
  }
  const hourRate = checkRateLimit(`book:hour:${ip}`, 30, 60 * 60_000);
  if (!hourRate.ok) {
    return NextResponse.json({ error: "Trop de tentatives. Reessaie dans 1 heure." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = bookingCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation echouee.", issues: parsed.error.flatten() }, { status: 400 });
  }

  if ((parsed.data.website ?? "").trim() !== "") {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }
  if (parsed.data.formStartedAt && Date.now() - parsed.data.formStartedAt < 2_000) {
    return NextResponse.json({ error: "Formulaire envoye trop rapidement." }, { status: 400 });
  }

  try {
    const booking = createBooking({
      slotId: parsed.data.slotId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail,
      notes: parsed.data.notes || null,
    });

    const mailPayload = {
      bookingId: booking.id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail ?? parsed.data.customerEmail,
      customerPhone: booking.customerPhone,
      notes: booking.notes,
      serviceName: booking.serviceName,
      startAt: booking.startAt,
    };

    await Promise.all([
      sendBookingPendingEmail(mailPayload),
      sendAdminNewBookingRequestEmail(mailPayload),
    ]);

    addAuditLog({
      eventType: "booking.create_pending",
      actorType: "customer",
      actorId: maskEmail(booking.customerEmail),
      message: `Nouvelle reservation en attente #${booking.id}`,
      meta: {
        bookingId: booking.id,
        slotId: parsed.data.slotId,
        serviceId: booking.serviceId,
        customerEmail: maskEmail(booking.customerEmail),
        customerPhone: maskPhone(booking.customerPhone),
      },
    });

    console.log(`[booking] created id=${booking.id} slotId=${parsed.data.slotId} status=pending`);

    return NextResponse.json({ bookingId: booking.id, status: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerBlockedError) {
      return NextResponse.json(
        { error: "Reservation indisponible pour ce compte. Contacte l'institut.", code: "CUSTOMER_BLOCKED" },
        { status: 403 },
      );
    }

    if (error instanceof BookingConflictError || error instanceof DailyLimitExceededError) {
      const slot = getSlotById(parsed.data.slotId);
      if (slot) {
        const wait = createWaitlistEntry({
          serviceId: slot.serviceId,
          preferredDate: isoToLocalDate(slot.startAt),
          preferredTime: formatTime(slot.startAt),
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail,
          notes: parsed.data.notes || null,
        });

        addAuditLog({
          eventType: "waitlist.create_from_booking",
          actorType: "customer",
          actorId: maskEmail(wait.customerEmail),
          message: `Ajout liste d'attente #${wait.id}`,
          meta: { waitlistId: wait.id, serviceId: wait.serviceId, preferredDate: wait.preferredDate },
        });

        return NextResponse.json(
          {
            status: "waitlisted",
            message: "Creneau indisponible, tu as ete ajoutee a la liste d'attente.",
            waitlistId: wait.id,
          },
          { status: 202 },
        );
      }

      return NextResponse.json({ error: "Creneau indisponible.", code: "SLOT_TAKEN" }, { status: 409 });
    }
    console.error("[booking] creation failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
