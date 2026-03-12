import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import { listOutboxEmails, retryOutboxEmail } from "@/lib/emailOutbox";
import { processEmailOutbox } from "@/lib/email";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { emailOutboxActionSchema, emailOutboxListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const parsed = emailOutboxListQuerySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = listOutboxEmails({
    status: parsed.data.status,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });

  // Ne jamais exposer textBody/htmlBody — ils contiennent des liens reset/verify sensibles.
  const safeItems = data.items.map(({ textBody: _t, htmlBody: _h, ...item }) => item);

  return NextResponse.json({ ...data, items: safeItems });
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
  const parsed = emailOutboxActionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = retryOutboxEmail(parsed.data.id);
  if (!updated) {
    return NextResponse.json({ error: "Email introuvable ou non relancable." }, { status: 404 });
  }

  await processEmailOutbox(10);
  return NextResponse.json({ ok: true });
}
