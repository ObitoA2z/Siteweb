import { NextRequest, NextResponse } from "next/server";

import { createEmailVerificationToken } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmailVerificationEmail } from "@/lib/email";
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
  const rate = await checkRateLimit(`verify-email-request:${ip}`, 8, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de demandes. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerForgotPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tokenData = createEmailVerificationToken(parsed.data.email);
  if (tokenData) {
    const verifyUrl = `${env.APP_BASE_URL}/account/verify-email?token=${encodeURIComponent(tokenData.token)}`;
    await sendEmailVerificationEmail({
      customerName: tokenData.customerName,
      customerEmail: tokenData.customerEmail,
      verifyUrl,
    });
  }

  return NextResponse.json({ ok: true });
}
