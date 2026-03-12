"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  callbackUrl: string;
  initialEmail?: string;
  showRegisteredMessage?: boolean;
};

export function CustomerLoginForm({ callbackUrl, initialEmail, showRegisteredMessage = false }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Email ou mot de passe invalide.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Erreur reseau. Reessaie dans quelques secondes.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (verificationBusy || !email.trim()) {
      return;
    }

    setVerificationBusy(true);
    setVerificationMessage("");
    try {
      const response = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setVerificationMessage(data.error ?? "Impossible d'envoyer l'email.");
        return;
      }
      setVerificationMessage("Si ce compte existe et n'est pas verifie, un email a ete renvoye.");
    } catch {
      setVerificationMessage("Erreur reseau. Reessaie dans quelques secondes.");
    } finally {
      setVerificationBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Compte cliente</p>
        <h1 className="text-3xl font-bold">Connexion</h1>
      </div>

      {showRegisteredMessage ? (
        <p className="text-sm font-semibold text-[#5f4754]">
          Compte cree. Verifie ton email avant de gerer des actions sensibles.
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          maxLength={160}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          maxLength={128}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <div className="text-right">
          <Link href="/account/forgot-password" className="text-xs font-semibold text-[#2d1e27] underline">
            Mot de passe oublie ?
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}

      <button type="submit" className="btn-main w-full" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      <button type="button" className="btn-soft w-full" onClick={resendVerificationEmail} disabled={verificationBusy || !email.trim()}>
        {verificationBusy ? "Envoi..." : "Renvoyer verification email"}
      </button>

      {verificationMessage ? <p className="text-xs text-[#5f4754]">{verificationMessage}</p> : null}

      <p className="text-sm text-[#5f4754]">
        Pas encore de compte ?{" "}
        <Link href="/account/register" className="font-semibold text-[#2d1e27] underline">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}
