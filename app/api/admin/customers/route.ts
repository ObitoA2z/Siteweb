import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { addAuditLog, listCustomerAccounts, updateCustomerAccountMeta } from "@/lib/db";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { adminCustomerListQuerySchema, customerMetaUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const parsed = adminCustomerListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    provider: request.nextUrl.searchParams.get("provider") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const accounts = listCustomerAccounts({
    query: parsed.data.q,
    provider: parsed.data.provider,
  });
  return NextResponse.json(accounts);
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
  const parsed = customerMetaUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const account = updateCustomerAccountMeta(parsed.data);
  if (!account) {
    return NextResponse.json({ error: "Compte client introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "customer.meta.update",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Meta cliente #${account.id} mise a jour`,
    meta: {
      customerId: account.id,
      isVip: account.isVip,
      isBlacklisted: account.isBlacklisted,
    },
  });

  return NextResponse.json(account);
}
