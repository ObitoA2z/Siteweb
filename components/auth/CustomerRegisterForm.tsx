"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Inscription impossible.");
      setLoading(false);
      return;
    }

    router.push(`/account/login?email=${encodeURIComponent(form.email)}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Compte cliente</p>
        <h1 className="text-3xl font-bold">Inscription</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-name" className="block text-sm font-semibold">
          Nom complet
        </label>
        <input
          id="register-name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-phone" className="block text-sm font-semibold">
          Telephone (optionnel)
        </label>
        <input
          id="register-phone"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input
          id="register-password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          minLength={12}
          required
        />
        <p className="text-xs text-[#6b4a59]">
          12+ caracteres, avec majuscule, minuscule, chiffre et caractere special.
        </p>
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}

      <button type="submit" className="btn-main w-full" disabled={loading}>
        {loading ? "Creation..." : "Creer mon compte"}
      </button>

      <p className="text-sm text-[#5f4754]">
        Deja inscrite ?{" "}
        <Link href="/account/login" className="font-semibold text-[#2d1e27] underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
