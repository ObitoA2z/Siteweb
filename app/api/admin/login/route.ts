import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";

import { clearAdminLoginFailures, getAdminLoginLockSeconds, registerAdminLoginFailure } from "@/lib/adminLoginLock";
import { attachAdminCsrfCookie, ensureAdminCsrfToken, getAdminSession } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/db";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { adminLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }

  const bodySizeGuard = requireBodySize(request, 4 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }

  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const ip = getClientIp(request);
  const rate = await checkRateLimit(`admin-login:${ip}`, 10, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de tentatives de connexion. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }

  const lockKey = `${ip}:${parsed.data.username.toLowerCase()}`;
  const lockSeconds = getAdminLoginLockSeconds(lockKey);
  if (lockSeconds > 0) {
    return NextResponse.json(
      { error: `Compte temporairement verrouille. Reessaie dans ${lockSeconds}s.` },
      { status: 429 },
    );
  }

  const admin = verifyAdminCredentials(parsed.data.username, parsed.data.password);
  if (!admin) {
    registerAdminLoginFailure(lockKey);
    return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect." }, { status: 401 });
  }

  if (env.ADMIN_TOTP_SECRET) {
    const otpCode = (parsed.data.otp ?? "").trim();
    const otpValid = otpCode ? authenticator.check(otpCode, env.ADMIN_TOTP_SECRET) : false;
    if (!otpValid) {
      registerAdminLoginFailure(lockKey);
      return NextResponse.json({ error: "Code 2FA invalide." }, { status: 401 });
    }
  }

  clearAdminLoginFailures(lockKey);

  const session = await getAdminSession();
  session.csrfToken = undefined;
  session.isLoggedIn = true;
  session.userId = admin.id;
  session.username = admin.username;
  session.issuedAt = new Date().toISOString();
  const csrfToken = await ensureAdminCsrfToken(session);

  const response = NextResponse.json({ ok: true, username: admin.username });
  attachAdminCsrfCookie(response, csrfToken);
  return response;
}
