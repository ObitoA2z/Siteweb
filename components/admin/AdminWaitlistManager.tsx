"use client";

import { useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import type { WaitlistEntry, WaitlistStatus } from "@/lib/types";

type Props = {
  initialEntries: WaitlistEntry[];
};

export function AdminWaitlistManager({ initialEntries }: Props) {
  const [entries, setEntries] = useState<WaitlistEntry[]>(initialEntries);
  const [statusFilter, setStatusFilter] = useState<"" | WaitlistStatus>("");
  const [dateFilter, setDateFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    const response = await fetch(`/api/admin/waitlist?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as { error?: string } | WaitlistEntry[];
    if (!response.ok || !Array.isArray(data)) {
      setMessage(!Array.isArray(data) ? (data.error ?? "Chargement impossible.") : "Chargement impossible.");
      setBusy(false);
      return;
    }
    setEntries(data);
    setBusy(false);
  }

  async function updateStatus(id: number, status: WaitlistStatus) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ id, status }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } | WaitlistEntry;
    if (!response.ok || !("id" in data)) {
      setMessage(!("id" in data) ? (data.error ?? "Mise a jour impossible.") : "Mise a jour impossible.");
      setBusy(false);
      return;
    }
    setEntries((prev) => prev.map((item) => (item.id === id ? data : item)));
    setMessage("Statut liste d'attente mis a jour.");
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Filtres</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | WaitlistStatus)}>
            <option value="">Tous les statuts</option>
            <option value="pending">pending</option>
            <option value="contacted">contacted</option>
            <option value="converted">converted</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <button type="button" className="btn-main" onClick={reload} disabled={busy}>
            Recharger
          </button>
          <button
            type="button"
            className="btn-soft"
            onClick={() => {
              setStatusFilter("");
              setDateFilter("");
              void reload();
            }}
            disabled={busy}
          >
            Reset
          </button>
        </div>
      </article>

      <AdminTable
        headers={["Client", "Contact", "Service", "Date souhaitee", "Notes", "Statut", "Actions"]}
        rows={entries.map((entry) => [
          <span key="name" className="font-semibold">
            {entry.customerName}
          </span>,
          <div key="contact">
            <p>{entry.customerPhone}</p>
            <p className="text-xs">{entry.customerEmail}</p>
          </div>,
          <span key="service">{entry.serviceName ?? entry.serviceId}</span>,
          <span key="date">
            {entry.preferredDate}
            {entry.preferredTime ? ` ${entry.preferredTime}` : ""}
          </span>,
          <span key="notes">{entry.notes || "-"}</span>,
          <strong key="status" className="uppercase text-xs">
            {entry.status}
          </strong>,
          <div key="actions" className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-soft text-xs"
              onClick={() => updateStatus(entry.id, "contacted")}
              disabled={busy}
            >
              Contactee
            </button>
            <button
              type="button"
              className="btn-soft text-xs"
              onClick={() => updateStatus(entry.id, "converted")}
              disabled={busy}
            >
              Convertie
            </button>
            <button
              type="button"
              className="rounded-full border border-[#8f2e4f44] px-3 py-2 text-xs font-semibold text-[#8f2e4f]"
              onClick={() => updateStatus(entry.id, "cancelled")}
              disabled={busy}
            >
              Annuler
            </button>
          </div>,
        ])}
      />

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}

