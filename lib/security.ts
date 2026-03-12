import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Nombre maximum de proxies de confiance à traverser.
// En production derrière Cloudflare/Nginx, ce nombre est généralement 1 ou 2.
// Mettre à 0 pour désactiver x-forwarded-for complètement (connexion directe).
const configuredProxyDepth = Number(process.env.TRUSTED_PROXY_DEPTH ?? "1");
const TRUSTED_PROXY_DEPTH =
  env.TRUST_PROXY_HEADERS && Number.isFinite(configuredProxyDepth)
    ? Math.max(1, Math.floor(configuredProxyDepth))
    : 0;

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getConfiguredOrigins(): Set<string> {
  const origins = new Set<string>(["http://localhost:3000", "http://127.0.0.1:3000"]);
  const appOrigin = normalizeOrigin(env.APP_BASE_URL);
  if (appOrigin) {
    origins.add(appOrigin);
  }

  const nextAuthOrigin = normalizeOrigin(process.env.NEXTAUTH_URL ?? "");
  if (nextAuthOrigin) {
    origins.add(nextAuthOrigin);
  }

  return origins;
}

function getRequestOrigin(request: NextRequest): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (!host) {
    return null;
  }

  const protocol = request.nextUrl.protocol.replace(":", "") || "http";
  return `${protocol}://${host}`;
}

/**
 * Retourne l'IP réelle du client de façon sûre.
 *
 * Stratégie :
 * - Si TRUSTED_PROXY_DEPTH = 0 : on ignore complètement x-forwarded-for
 *   et on utilise uniquement la connexion TCP directe (Cloudflare: cf-connecting-ip).
 * - Si TRUSTED_PROXY_DEPTH >= 1 : on prend la N-ième adresse depuis la droite
 *   dans x-forwarded-for (où N = TRUSTED_PROXY_DEPTH), ce qui correspond à
 *   l'IP ajoutée par le dernier proxy de confiance — et non la première
 *   (qui peut être forgée par le client).
 *
 * Exemple : X-Forwarded-For: "1.2.3.4, 5.6.7.8, 10.0.0.1" avec depth=1
 *   → on ignore 1.2.3.4 et 5.6.7.8 (potentiellement forgés)
 *   → on retourne 5.6.7.8 (ajouté par le proxy de confiance, avant le dernier)
 *   → plus précisément : ips[ips.length - TRUSTED_PROXY_DEPTH - 1]
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare : CF injecte toujours cette en-tête et elle est fiable
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  // Sans proxy de confiance configuré : on ne fait pas confiance au header
  if (TRUSTED_PROXY_DEPTH <= 0) {
    return "unknown";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown";
  }

  const ips = forwarded
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (ips.length === 0) {
    return "unknown";
  }

  // On prend l'IP à l'index (length - depth - 1) pour bypasser les IPs forgées
  // Si depth >= nb d'IPs, on prend la première (la moins fiable mais mieux que rien)
  const safeIndex = Math.max(0, ips.length - TRUSTED_PROXY_DEPTH - 1);
  return ips[safeIndex] ?? "unknown";
}

export function requireJsonRequest(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type doit etre application/json." }, { status: 415 });
  }
  return null;
}

export function requireBodySize(request: NextRequest, maxBytes: number): NextResponse | null {
  const contentLengthRaw = request.headers.get("content-length");
  if (!contentLengthRaw) {
    return null;
  }

  const contentLength = Number(contentLengthRaw);
  if (!Number.isFinite(contentLength)) {
    return NextResponse.json({ error: "Content-Length invalide." }, { status: 400 });
  }

  if (contentLength > maxBytes) {
    return NextResponse.json({ error: "Requete trop volumineuse." }, { status: 413 });
  }

  return null;
}

export function requireTrustedOrigin(request: NextRequest): NextResponse | null {
  if (!mutatingMethods.has(request.method.toUpperCase())) {
    return null;
  }

  const originHeader = request.headers.get("origin");
  const secFetchSite = (request.headers.get("sec-fetch-site") ?? "").toLowerCase();
  const allowed = getConfiguredOrigins();
  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin) {
    allowed.add(requestOrigin);
  }

  if (!originHeader) {
    if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
      return NextResponse.json({ error: "Origin non autorisee." }, { status: 403 });
    }
    return null;
  }

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin || !allowed.has(normalizedOrigin)) {
    return NextResponse.json({ error: "Origin non autorisee." }, { status: 403 });
  }

  return null;
}
