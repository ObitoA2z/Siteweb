import { NextRequest, NextResponse } from "next/server";

import { consumePasswordResetToken, updateCustomerPasswordByEmail } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { customerResetPasswordSchema } from "@/lib/validation";

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

  const ip = getClientIp(request);
  const rate = await checkRateLimit(`reset-password:${ip}`, 10, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de tentatives. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerResetPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tokenPayload = consumePasswordResetToken(parsed.data.token);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Lien invalide ou expire." }, { status: 400 });
  }

  const updated = updateCustomerPasswordByEmail(tokenPayload.email, parsed.data.password);
  if (!updated) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
