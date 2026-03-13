"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerRegisterForm({ initialReferralCode = "" }: { initialReferralCode?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    website: "",
    referralCode: initialReferralCode,
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formStartedAt] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setLoading(true);
    setError("");

    if (form.password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: normalizedEmail,
          phone: form.phone,
          password: form.password,
          website: form.website,
          formStartedAt,
          ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim() } : {}),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Inscription impossible.");
        return;
      }

      router.push(`/account/login?email=${encodeURIComponent(normalizedEmail)}&registered=1`);
      router.refresh();
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
        <h1 className="text-3xl font-bold">Inscription</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-name" className="block text-sm font-semibold">
          Nom complet
        </label>
        <input
          id="register-name"
          value={form.name}
          maxLength={100}
          autoComplete="name"
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
          maxLength={160}
          autoComplete="email"
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
          type="tel"
          inputMode="tel"
          maxLength={40}
          autoComplete="tel"
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
          maxLength={128}
          autoComplete="new-password"
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          minLength={12}
          required
        />
        <p className="text-xs text-[#6b4a59]">
          12+ caracteres, avec majuscule, minuscule, chiffre et caractere special.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password-confirm" className="block text-sm font-semibold">
          Confirmer le mot de passe
        </label>
        <input
          id="register-password-confirm"
          type="password"
          value={confirmPassword}
          maxLength={128}
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={12}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-referral" className="block text-sm font-semibold">
          Code de parrainage (optionnel)
        </label>
        <input
          id="register-referral"
          value={form.referralCode}
          maxLength={20}
          autoComplete="off"
          placeholder="Ex : AB12CD"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, referralCode: event.target.value.toUpperCase() }))
          }
        />
        <p className="text-xs text-[#8a6578]">
          Si une amie t&apos;a recommande le salon, saisis son code ici.
        </p>
      </div>

      <div className="hidden" aria-hidden>
        <label htmlFor="register-website">Ne pas remplir</label>
        <input
          id="register-website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
        />
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
