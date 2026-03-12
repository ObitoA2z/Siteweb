"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  token: string;
};

export function CustomerResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setError("");
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Reinitialisation impossible.");
        return;
      }

      setDone(true);
      setTimeout(() => {
        router.push("/account/login");
      }, 1200);
    } catch {
      setError("Erreur reseau. Reessaie dans quelques secondes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Compte cliente</p>
        <h1 className="text-3xl font-bold">Nouveau mot de passe</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="reset-password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reset-password-confirm" className="block text-sm font-semibold">
          Confirmer le mot de passe
        </label>
        <input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      <p className="text-xs text-[#6b4a59]">
        12+ caracteres, avec majuscule, minuscule, chiffre et caractere special.
      </p>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}
      {done ? <p className="text-sm font-semibold text-[#5f4754]">Mot de passe mis a jour. Redirection...</p> : null}

      <button type="submit" className="btn-main w-full" disabled={loading || done}>
        {loading ? "Mise a jour..." : "Mettre a jour"}
      </button>

      <p className="text-sm text-[#5f4754]">
        Retour a{" "}
        <Link href="/account/login" className="font-semibold text-[#2d1e27] underline">
          la connexion
        </Link>
      </p>
    </form>
  );
}
