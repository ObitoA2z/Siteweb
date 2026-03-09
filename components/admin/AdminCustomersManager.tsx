"use client";

import { useMemo, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { formatDateTime } from "@/lib/time";
import type { CustomerAccountSummary } from "@/lib/types";

type Props = {
  initialAccounts: CustomerAccountSummary[];
};

function toCsvValue(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

export function AdminCustomersManager({ initialAccounts }: Props) {
  const [accounts, setAccounts] = useState<CustomerAccountSummary[]>(initialAccounts);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"" | "email" | "google" | "email+google">("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const stats = useMemo(
    () => ({
      total: accounts.length,
      email: accounts.filter((account) => account.authProvider === "email").length,
      google: accounts.filter((account) => account.authProvider === "google").length,
      both: accounts.filter((account) => account.authProvider === "email+google").length,
      vip: accounts.filter((account) => account.isVip).length,
      blacklisted: accounts.filter((account) => account.isBlacklisted).length,
    }),
    [accounts],
  );

  async function reload() {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (provider) params.set("provider", provider);

    const response = await fetch(`/api/admin/customers?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as { error?: string } | CustomerAccountSummary[];
    if (!response.ok || !Array.isArray(data)) {
      setMessage(!Array.isArray(data) ? (data.error ?? "Chargement impossible.") : "Chargement impossible.");
      setBusy(false);
      return;
    }

    setAccounts(data);
    setBusy(false);
  }

  function exportCsv() {
    const headers = [
      "id",
      "name",
      "email",
      "phone",
      "auth_provider",
      "created_at",
      "booking_count",
      "last_booking_at",
      "last_booking_status",
      "is_vip",
      "is_blacklisted",
      "cancelled_count",
      "internal_notes",
    ];
    const rows = accounts.map((account) => [
      account.id,
      account.name,
      account.email,
      account.phone,
      account.authProvider,
      account.createdAt,
      account.bookingCount,
      account.lastBookingAt,
      account.lastBookingStatus,
      account.isVip ? "1" : "0",
      account.isBlacklisted ? "1" : "0",
      account.cancelledCount,
      account.internalNotes,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => toCsvValue(cell as string | number | null | undefined)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comptes-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function patchAccount(id: number, patch: Partial<CustomerAccountSummary>) {
    setAccounts((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function saveMeta(account: CustomerAccountSummary) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({
        id: account.id,
        isVip: account.isVip,
        isBlacklisted: account.isBlacklisted,
        internalNotes: account.internalNotes ?? "",
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Mise a jour impossible.");
      setBusy(false);
      return;
    }
    setMessage("Profil cliente mis a jour.");
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Filtres comptes</h2>
          <button type="button" onClick={exportCsv} className="btn-soft text-sm" disabled={accounts.length === 0}>
            Export CSV
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recherche nom / email / telephone"
          />
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as "" | "email" | "google" | "email+google")}
          >
            <option value="">Tous les providers</option>
            <option value="email">email</option>
            <option value="google">google</option>
            <option value="email+google">email+google</option>
          </select>
          <button type="button" onClick={reload} className="btn-main" disabled={busy}>
            Filtrer
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setProvider("");
              void reload();
            }}
            className="btn-soft"
            disabled={busy}
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Total: {stats.total}</span>
          <span className="rounded-full bg-[#fff4e9] px-3 py-1 font-semibold">Email: {stats.email}</span>
          <span className="rounded-full bg-[#eaf8ff] px-3 py-1 font-semibold">Google: {stats.google}</span>
          <span className="rounded-full bg-[#ffeef2] px-3 py-1 font-semibold">Email+Google: {stats.both}</span>
          <span className="rounded-full bg-[#eafaf0] px-3 py-1 font-semibold">VIP: {stats.vip}</span>
          <span className="rounded-full bg-[#fff0f0] px-3 py-1 font-semibold">Blacklist: {stats.blacklisted}</span>
        </div>
      </article>

      <AdminTable
        headers={[
          "Nom",
          "Email",
          "Telephone",
          "Connexion",
          "Cree le",
          "Reservations",
          "Derniere reservation",
          "Profil",
          "Actions",
        ]}
        rows={accounts.map((account) => [
          <span key="name" className="font-semibold">
            {account.name}
          </span>,
          <span key="email">{account.email}</span>,
          <span key="phone">{account.phone || "-"}</span>,
          <span key="auth" className="uppercase text-xs tracking-wide">
            {account.authProvider}
          </span>,
          <span key="created">{formatDateTime(account.createdAt)}</span>,
          <span key="count">{account.bookingCount}</span>,
          <div key="last">
            {account.lastBookingAt ? (
              <>
                <p>{formatDateTime(account.lastBookingAt)}</p>
                <p className="text-xs uppercase text-[#6b4a59]">{account.lastBookingStatus}</p>
              </>
            ) : (
              <span>-</span>
            )}
          </div>,
          <div key="profile" className="min-w-[220px] space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={account.isVip}
                onChange={(event) => patchAccount(account.id, { isVip: event.target.checked })}
              />
              VIP
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={account.isBlacklisted}
                onChange={(event) => patchAccount(account.id, { isBlacklisted: event.target.checked })}
              />
              Blacklist
            </label>
            <p className="text-xs text-[#6b4a59]">Annulations: {account.cancelledCount}</p>
            <textarea
              value={account.internalNotes ?? ""}
              onChange={(event) => patchAccount(account.id, { internalNotes: event.target.value })}
              className="min-h-20 w-full rounded-xl border border-[#2d1e2720] p-2 text-xs"
              placeholder="Notes internes"
              maxLength={1000}
            />
          </div>,
          <button
            key="actions"
            type="button"
            className="btn-soft text-xs"
            onClick={() => saveMeta(account)}
            disabled={busy}
          >
            Sauver
          </button>,
        ])}
      />

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
