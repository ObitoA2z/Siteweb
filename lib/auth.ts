import { randomBytes } from "node:crypto";

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

export interface AdminSessionData {
  isLoggedIn?: boolean;
  userId?: number;
  username?: string;
  issuedAt?: string;
  csrfToken?: string;
}

const useSecureCookie = env.ADMIN_COOKIE_SECURE;
const adminSessionMaxAge = 60 * 60 * 24 * 7;

export const ADMIN_CSRF_COOKIE = "lash_admin_csrf";

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  ttl: adminSessionMaxAge,
  cookieName: "lash_admin_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: useSecureCookie,
    maxAge: adminSessionMaxAge,
    path: "/",
  },
};

export const ADMIN_SESSION_COOKIE = sessionOptions.cookieName;

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, sessionOptions);
}

function generateCsrfToken(): string {
  return randomBytes(24).toString("hex");
}

export async function ensureAdminCsrfToken(session?: AdminSessionData & { save: () => Promise<void> }): Promise<string> {
  const activeSession = session ?? (await getAdminSession());
  if (!activeSession.csrfToken) {
    activeSession.csrfToken = generateCsrfToken();
    await activeSession.save();
  }
  return activeSession.csrfToken;
}

export function attachAdminCsrfCookie(response: NextResponse, csrfToken: string) {
  response.cookies.set({
    name: ADMIN_CSRF_COOKIE,
    value: csrfToken,
    httpOnly: false,
    sameSite: "strict",
    secure: useSecureCookie,
    maxAge: adminSessionMaxAge,
    path: "/",
  });
}

export function clearAdminCsrfCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_CSRF_COOKIE,
    value: "",
    httpOnly: false,
    sameSite: "strict",
    secure: useSecureCookie,
    maxAge: 0,
    path: "/",
  });
}

export function requireAdminCsrf(
  request: NextRequest,
  session: AdminSessionData,
): { ok: true } | { ok: false; response: NextResponse } {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get(ADMIN_CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken || !session.csrfToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "CSRF token manquant. Reconnecte-toi." }, { status: 403 }),
    };
  }

  if (headerToken !== cookieToken || headerToken !== session.csrfToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "CSRF token invalide." }, { status: 403 }),
    };
  }

  return { ok: true };
}

export async function requireAdminApiSession() {
  const session = await getAdminSession();
  if (!session.isLoggedIn || !session.userId) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    session,
    response: null,
  };
}
