import { NextRequest, NextResponse } from "next/server";

import { clearAdminCsrfCookie, requireAdminApiSession } from "@/lib/auth";
import { requireTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  await guard.session.destroy();

  const response = NextResponse.json({ ok: true });
  clearAdminCsrfCookie(response);
  return response;
}
