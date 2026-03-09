import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { addAuditLog, cancelBooking, confirmBooking, listBookings, markBookingNoShow, rejectBookingCancellationRequest } from "@/lib/db";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { getUtcBoundsForLocalDay } from "@/lib/time";
import { bookingAdminActionSchema, bookingListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const parsed = bookingListQuerySchema.safeParse({
    serviceId: request.nextUrl.searchParams.get("serviceId") ?? undefined,
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const bounds = parsed.data.date ? getUtcBoundsForLocalDay(parsed.data.date) : null;
  const bookings = listBookings({
    serviceId: parsed.data.serviceId,
    startUtc: bounds?.startUtc,
    endUtc: bounds?.endUtc,
    status: parsed.data.status,
    query: parsed.data.q,
  });

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }
  const bodySizeGuard = requireBodySize(request, 8 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }
  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = bookingAdminActionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "confirm") {
    const booking = confirmBooking(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Reservation introuvable ou deja annulee." }, { status: 404 });
    }

    if (booking.customerEmail) {
      await sendBookingConfirmedEmail({
        bookingId: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.serviceName,
        startAt: booking.startAt,
      });
    }

    console.log(`[booking] confirmed id=${parsed.data.bookingId}`);
    addAuditLog({
      eventType: "booking.confirm",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Reservation #${parsed.data.bookingId} confirmee`,
      meta: { bookingId: parsed.data.bookingId },
    });
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (parsed.data.action === "reject_cancel_request") {
    const booking = rejectBookingCancellationRequest(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Demande d'annulation introuvable." }, { status: 404 });
    }

    console.log(`[booking] cancel request rejected id=${parsed.data.bookingId}`);
    addAuditLog({
      eventType: "booking.cancel_request.reject",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Demande d'annulation refusee pour reservation #${parsed.data.bookingId}`,
      meta: { bookingId: parsed.data.bookingId },
    });
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (parsed.data.action === "mark_no_show") {
    const booking = markBookingNoShow(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Reservation introuvable ou annulee." }, { status: 404 });
    }

    addAuditLog({
      eventType: "booking.no_show",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Reservation #${parsed.data.bookingId} marquee no_show`,
      meta: { bookingId: parsed.data.bookingId },
    });
    return NextResponse.json({ ok: true, status: "no_show" });
  }

  const booking = cancelBooking(parsed.data.bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Reservation introuvable." }, { status: 404 });
  }

  console.log(`[booking] cancelled id=${parsed.data.bookingId}`);
  addAuditLog({
    eventType: "booking.cancel",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Reservation #${parsed.data.bookingId} annulee`,
    meta: { bookingId: parsed.data.bookingId },
  });
  return NextResponse.json({ ok: true, status: "cancelled" });
}
