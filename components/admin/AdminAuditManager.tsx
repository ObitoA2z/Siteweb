"use client";

import { useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { formatDateTime } from "@/lib/time";
import type { AuditLogItem } from "@/lib/types";

type Props = {
  initialLogs: AuditLogItem[];
};

export function AdminAuditManager({ initialLogs }: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [dateFilter, setDateFilter] = useState("");
  const [eventType, setEventType] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (eventType.trim()) params.set("eventType", eventType.trim());

    const response = await fetch(`/api/admin/audit?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as { error?: string } | AuditLogItem[];
    if (!response.ok || !Array.isArray(data)) {
      setMessage(!Array.isArray(data) ? (data.error ?? "Chargement impossible.") : "Chargement impossible.");
      setBusy(false);
      return;
    }
    setLogs(data);
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Filtres journal</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <input
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            placeholder="eventType ex: booking.confirm"
          />
          <button type="button" onClick={reload} className="btn-main" disabled={busy}>
            Rechercher
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilter("");
              setEventType("");
              void reload();
            }}
            className="btn-soft"
            disabled={busy}
          >
            Reset
          </button>
        </div>
      </article>

      <AdminTable
        headers={["Date", "Type", "Acteur", "Message", "Meta"]}
        rows={logs.map((log) => [
          <span key="date">{formatDateTime(log.createdAt)}</span>,
          <span key="type" className="text-xs font-semibold">
            {log.eventType}
          </span>,
          <span key="actor" className="text-xs uppercase tracking-wide">
            {log.actorType}
            {log.actorId ? ` (${log.actorId})` : ""}
          </span>,
          <span key="message">{log.message}</span>,
          <code key="meta" className="text-xs text-[#6b4a59]">
            {log.metaJson ? log.metaJson.slice(0, 140) : "-"}
          </code>,
        ])}
      />

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
