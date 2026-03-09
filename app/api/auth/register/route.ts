import { NextRequest, NextResponse } from "next/server";

import { createCustomerUser } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { customerRegisterSchema } from "@/lib/validation";

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
  const rate = checkRateLimit(`register:${ip}`, 5, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Trop de creations de compte. Reessaie plus tard." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerRegisterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation invalide.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const user = createCustomerUser(parsed.data);
  if (!user) {
    return NextResponse.json({ error: "Un compte avec cet email existe deja." }, { status: 409 });
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    },
    { status: 201 },
  );
}
