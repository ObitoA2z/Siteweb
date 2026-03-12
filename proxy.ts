import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

// ─── Content Security Policy ─────────────────────────────────────────────────

function buildCsp(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js App Router requiert 'unsafe-inline' pour les scripts inline d'hydratation.
    // 'unsafe-eval' est retiré — il n'est pas requis en production (Turbopack dev seulement).
    "script-src": [
      "'self'",
      "'unsafe-inline'",
    ],
    "style-src": [
      "'self'",
      "https://fonts.googleapis.com",
      "'unsafe-inline'",
    ],
    "font-src": [
      "'self'",
      "https://fonts.gstatic.com",
      "data:",
    ],
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'", "https:"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(" ")}` : key,
    )
    .join("; ");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLocalhost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:")
  );
}

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const protocol = (
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();
  const isHttps = protocol === "https";

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
  );
  response.headers.set("Content-Security-Policy", buildCsp());
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

function unauthorizedApiResponse(request: NextRequest): NextResponse {
  return applySecurityHeaders(
    request,
    NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  );
}

// ─── Proxy principal ─────────────────────────────────────────────────────────

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const proto = (
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();
  const isHttps = proto === "https";
  const local = isLocalhost(host);

  // 1. Redirection HTTP → HTTPS (hors localhost)
  if (!isHttps && !local) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  // 2. Bloquer les extensions dangereuses
  const dangerousExtensions = /\.(php|asp|aspx|cgi|sh|env|git|sql|bak|log)$/i;
  if (dangerousExtensions.test(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 3. Bloquer les tentatives de path traversal
  if (pathname.includes("..") || pathname.includes("//")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // 4. Protection admin — API
  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login") {
      return applySecurityHeaders(request, NextResponse.next());
    }
    if (!request.cookies.has(ADMIN_SESSION_COOKIE)) {
      return unauthorizedApiResponse(request);
    }
    return applySecurityHeaders(request, NextResponse.next());
  }

  // 5. Protection admin — pages
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!request.cookies.has(ADMIN_SESSION_COOKIE)) {
      const loginUrl = new URL("/admin/login", request.url);
      return applySecurityHeaders(request, NextResponse.redirect(loginUrl));
    }
  }

  // 6. Toutes les autres routes — headers de sécurité uniquement
  return applySecurityHeaders(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
