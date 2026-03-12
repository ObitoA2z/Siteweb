import { NextRequest, NextResponse } from "next/server";

import { verifyCustomerEmailByToken } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { customerEmailVerifyTokenSchema } from "@/lib/validation";

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
  const rate = await checkRateLimit(`verify-email:${ip}`, 15, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de tentatives. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerEmailVerifyTokenSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const verified = verifyCustomerEmailByToken(parsed.data.token);
  if (!verified) {
    return NextResponse.json({ error: "Lien invalide ou expire." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
