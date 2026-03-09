import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("cf-connecting-ip") ?? "unknown";
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
