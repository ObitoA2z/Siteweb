import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { env } from "@/lib/env";
import {
  clearCustomerLoginFailures,
  getCustomerLoginLockSeconds,
  registerCustomerLoginFailure,
} from "@/lib/customerLoginLock";
import { upsertGoogleCustomerUser, verifyCustomerCredentials } from "@/lib/db";
import { customerLoginSchema } from "@/lib/validation";

export const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email et mot de passe",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(rawCredentials, req) {
      const parsed = customerLoginSchema.safeParse(rawCredentials);
      if (!parsed.success) {
        return null;
      }

      // Clé "ip:email" pour éviter qu'un attaquant verrouille le compte d'un autre
      // utilisateur depuis une IP différente (DoS ciblé).
      // Clé "ip" seule utilisée en complément dans l'API route pour le password-spraying.
      const reqHeaders = (req as { headers?: Record<string, string> })?.headers ?? {};
      const cfIp = reqHeaders["cf-connecting-ip"];
      const forwardedFor = reqHeaders["x-forwarded-for"];
      const ip =
        (cfIp && cfIp.trim()) ||
        (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
        "unknown";

      const lockKeyIpEmail = `${ip}:${parsed.data.email}`;
      const lockKeyIp = ip;

      const lockSeconds =
        Math.max(
          getCustomerLoginLockSeconds(lockKeyIpEmail),
          getCustomerLoginLockSeconds(lockKeyIp),
        );
      if (lockSeconds > 0) {
        return null;
      }

      const user = verifyCustomerCredentials(parsed.data.email, parsed.data.password);
      if (!user) {
        registerCustomerLoginFailure(lockKeyIpEmail);
        registerCustomerLoginFailure(lockKeyIp);
        return null;
      }

      clearCustomerLoginFailures(lockKeyIpEmail);
      clearCustomerLoginFailures(lockKeyIp);

      return {
        id: String(user.id),
        name: user.name,
        email: user.email,
      };
    },
  }),
];

if (googleAuthEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  );
}

export const customerAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || env.SESSION_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/account/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email ?? (typeof profile?.email === "string" ? profile.email : null);
        if (!email) {
          return false;
        }

        const dbUser = upsertGoogleCustomerUser({
          email,
          name: user.name ?? (typeof profile?.name === "string" ? profile.name : "Cliente"),
          googleId: account.providerAccountId,
        });

        user.id = String(dbUser.id);
        user.email = dbUser.email;
        user.name = dbUser.name;
      }

      return true;
    },
    async jwt({ token, user }) {
      const mutableToken = token as { userId?: string; email?: string | null; name?: string | null };

      if (user?.id) {
        mutableToken.userId = user.id;
      }

      if (user?.email) {
        mutableToken.email = user.email;
      }

      if (user?.name) {
        mutableToken.name = user.name;
      }

      return mutableToken;
    },
    async session({ session, token }) {
      const typedToken = token as { userId?: string; email?: string | null; name?: string | null };
      if (session.user) {
        (session.user as { id?: string }).id =
          typeof typedToken.userId === "string" ? typedToken.userId : undefined;
        session.user.email = typedToken.email ?? null;
        session.user.name = typedToken.name ?? null;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
};
