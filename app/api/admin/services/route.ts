import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { addAuditLog, createService, deleteService, listServices, updateService } from "@/lib/db";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { serviceCreateSchema, serviceDeleteSchema, serviceUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  return NextResponse.json(listServices({ includeInactive: true }));
}

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

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = serviceCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const service = createService(parsed.data);
  addAuditLog({
    eventType: "service.create",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Service cree: ${service.name}`,
    meta: { serviceId: service.id },
  });
  return NextResponse.json(service, { status: 201 });
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
  const parsed = serviceUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const service = updateService(parsed.data);
  if (!service) {
    return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "service.update",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Service modifie: ${service.name}`,
    meta: { serviceId: service.id },
  });
  return NextResponse.json(service);
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
  const parsed = serviceDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ok = deleteService(parsed.data.id);
  if (!ok) {
    return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "service.delete",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Service supprime/desactive #${parsed.data.id}`,
    meta: { serviceId: parsed.data.id },
  });
  return NextResponse.json({ ok: true });
}
