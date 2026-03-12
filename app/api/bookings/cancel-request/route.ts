import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { customerAuthOptions } from "@/lib/customerAuth";
import { addAuditLog, getCustomerUserByEmail, requestBookingCancellationByCustomer } from "@/lib/db";
import { logInfo } from "@/lib/logger";
import { maskEmail } from "@/lib/privacy";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { bookingCustomerCancelRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

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

  const session = await getServerSession(customerAuthOptions);
  const customerEmail = session?.user?.email;
  if (!customerEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerUser = getCustomerUserByEmail(customerEmail);
  if (customerUser && !customerUser.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Adresse email non verifiee. Verifie ton email avant de modifier une reservation." },
      { status: 403 },
    );
  }

  const ip = getClientIp(request);
  const rate = await checkRateLimit(`cancel-request:${ip}:${customerEmail.toLowerCase()}`, 10, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de demandes. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = bookingCustomerCancelRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = requestBookingCancellationByCustomer(parsed.data.bookingId, customerEmail);
  if (!result.booking) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Reservation introuvable." }, { status: 404 });
    }
    if (result.reason === "not_confirmed") {
      return NextResponse.json({ error: "Seules les reservations confirmees peuvent etre annulees." }, { status: 400 });
    }
    if (result.reason === "already_requested") {
      return NextResponse.json({ error: "Demande d'annulation deja envoyee." }, { status: 409 });
    }
    if (result.reason === "already_cancelled") {
      return NextResponse.json({ error: "Reservation deja annulee." }, { status: 409 });
    }
    return NextResponse.json({ error: "Action impossible." }, { status: 400 });
  }

  logInfo("booking_cancel_request_created", { bookingId: result.booking.id });
  addAuditLog({
    eventType: "booking.cancel_request.create",
    actorType: "customer",
    actorId: maskEmail(customerEmail),
    message: `Demande d'annulation creee pour reservation #${result.booking.id}`,
    meta: { bookingId: result.booking.id },
  });
  return NextResponse.json({ ok: true, status: "cancel_requested", bookingId: result.booking.id });
}
