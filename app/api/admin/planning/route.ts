import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { addAuditLog, addClosedDay, deleteClosedDay, getBusinessSettings, listClosedDays, updateBusinessSettings } from "@/lib/db";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { closedDayCreateSchema, closedDayDeleteSchema, planningSettingsUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const startDate = request.nextUrl.searchParams.get("startDate") ?? undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") ?? undefined;
  return NextResponse.json({
    settings: getBusinessSettings(),
    closedDays: listClosedDays({ startDate, endDate }),
  });
}

export async function PUT(request: NextRequest) {
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

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = planningSettingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = updateBusinessSettings(parsed.data);
  addAuditLog({
    eventType: "planning.settings.update",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: "Configuration planning mise a jour",
    meta: parsed.data,
  });

  return NextResponse.json(updated);
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
  const parsed = closedDayCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const closedDay = addClosedDay({ date: parsed.data.date, reason: parsed.data.reason || null });
  addAuditLog({
    eventType: "planning.closed_day.upsert",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Jour ferme configure: ${closedDay.date}`,
    meta: { date: closedDay.date, reason: closedDay.reason },
  });

  return NextResponse.json(closedDay, { status: 201 });
}

export async function DELETE(request: NextRequest) {
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
  const parsed = closedDayDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ok = deleteClosedDay(parsed.data.date);
  if (!ok) {
    return NextResponse.json({ error: "Date fermee introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "planning.closed_day.delete",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Jour ferme retire: ${parsed.data.date}`,
    meta: { date: parsed.data.date },
  });

  return NextResponse.json({ ok: true });
}

