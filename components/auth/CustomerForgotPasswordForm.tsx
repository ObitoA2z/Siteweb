"use client";

import { useState } from "react";

export function CustomerForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Demande impossible.");
        return;
      }
      setMessage("Si ce compte existe, un email de reinitialisation a ete envoye.");
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
        <h1 className="text-3xl font-bold">Mot de passe oublie</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="forgot-email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          autoComplete="email"
          maxLength={160}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}

      <button type="submit" className="btn-main w-full" disabled={loading}>
        {loading ? "Envoi..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
