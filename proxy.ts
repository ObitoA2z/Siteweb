import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "upgrade-insecure-requests",
].join("; ");

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  const protocol = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).toLowerCase();
  if (protocol === "https") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

function unauthorizedApiResponse(request: NextRequest) {
  return applySecurityHeaders(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(ADMIN_SESSION_COOKIE);

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login") {
      return applySecurityHeaders(request, NextResponse.next());
    }
    if (!hasSessionCookie) {
      return unauthorizedApiResponse(request);
    }
    return applySecurityHeaders(request, NextResponse.next());
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!hasSessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      return applySecurityHeaders(request, NextResponse.redirect(loginUrl));
    }
  }

  return applySecurityHeaders(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
