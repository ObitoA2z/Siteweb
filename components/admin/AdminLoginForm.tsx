"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Connexion impossible.");
      setLoading(false);
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Connexion admin</h1>
        <p className="mt-1 text-sm text-[#5f4754]">Acces reserve a la gestion des reservations.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-semibold">
          Utilisateur
        </label>
        <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f2e4f]">{error}</p> : null}

      <button className="btn-main w-full" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
