import { NextRequest, NextResponse } from "next/server";

import { createPasswordResetToken } from "@/lib/db";
import { env } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { customerForgotPasswordSchema } from "@/lib/validation";

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
  const rate = await checkRateLimit(`forgot-password:${ip}`, 8, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de demandes. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerForgotPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tokenData = createPasswordResetToken(parsed.data.email);
  if (tokenData) {
    const resetUrl = `${env.APP_BASE_URL}/account/reset-password?token=${encodeURIComponent(tokenData.token)}`;
    await sendPasswordResetEmail({
      customerName: tokenData.customerName,
      customerEmail: tokenData.customerEmail,
      resetUrl,
    });
  }

  // Anti-enumeration: always return the same success response.
  return NextResponse.json({ ok: true });
}
