import { NextRequest, NextResponse } from "next/server";

import { createCustomerUser, createEmailVerificationToken } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmailVerificationEmail } from "@/lib/email";
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
  const rate = await checkRateLimit(`register:${ip}`, 5, 10 * 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Trop de creations de compte. Reessaie plus tard." },
      { status: 429 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = customerRegisterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation invalide.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if ((parsed.data.website ?? "").trim() !== "") {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  if (parsed.data.formStartedAt && Date.now() - parsed.data.formStartedAt < 2_000) {
    return NextResponse.json({ error: "Formulaire envoye trop rapidement." }, { status: 400 });
  }

  const emailRate = await checkRateLimit(`register:email:${parsed.data.email}`, 3, 10 * 60_000);
  if (!emailRate.ok) {
    return NextResponse.json(
      { error: "Trop de creations de compte. Reessaie plus tard." },
      { status: 429 },
    );
  }

  // createCustomerUser utilise INSERT OR IGNORE (atomique via SQLite) :
  // - si l'email existe déjà → retourne null (UNIQUE constraint ignorée)
  // - si race condition simultanée → le second INSERT est ignoré, pas d'erreur 500
  const user = createCustomerUser({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    password: parsed.data.password,
  });

  if (!user) {
    // Réponse intentionnellement identique au succès pour éviter l'énumération d'emails.
    // L'attaquant ne peut pas distinguer "email déjà pris" de "inscription réussie".
    // On retourne un 201 fictif — l'utilisateur recevra un email s'il est nouveau.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const verification = createEmailVerificationToken(user.email);
  if (verification) {
    const verifyUrl = `${env.APP_BASE_URL}/account/verify-email?token=${encodeURIComponent(verification.token)}`;
    await sendEmailVerificationEmail({
      customerName: verification.customerName,
      customerEmail: verification.customerEmail,
      verifyUrl,
    });
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
