"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  callbackUrl: string;
  initialEmail?: string;
};

export function CustomerLoginForm({ callbackUrl, initialEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Email ou mot de passe invalide.");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Compte cliente</p>
        <h1 className="text-3xl font-bold">Connexion</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
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
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}

      <button type="submit" className="btn-main w-full" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      <p className="text-sm text-[#5f4754]">
        Pas encore de compte ?{" "}
        <Link href="/account/register" className="font-semibold text-[#2d1e27] underline">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}
