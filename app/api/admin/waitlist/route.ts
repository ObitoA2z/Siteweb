import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { addAuditLog, listWaitlistEntries, updateWaitlistStatus } from "@/lib/db";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { waitlistUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const statusRaw = request.nextUrl.searchParams.get("status");
  const status =
    statusRaw === "pending" || statusRaw === "contacted" || statusRaw === "converted" || statusRaw === "cancelled"
      ? statusRaw
      : undefined;

  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  return NextResponse.json(listWaitlistEntries({ status, date }));
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
  const parsed = waitlistUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const entry = updateWaitlistStatus(parsed.data.id, parsed.data.status);
  if (!entry) {
    return NextResponse.json({ error: "Entree liste d'attente introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "waitlist.status.update",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Waitlist #${entry.id} -> ${entry.status}`,
    meta: { waitlistId: entry.id, status: entry.status },
  });

  return NextResponse.json(entry);
}

