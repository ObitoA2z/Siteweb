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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(initialLogs.length);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  async function reload(targetPage = page) {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (eventType.trim()) params.set("eventType", eventType.trim());
    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));

    const response = await fetch(`/api/admin/audit?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as
      | { error?: string }
      | AuditLogItem[]
      | { items: AuditLogItem[]; total: number; page: number; pageSize: number };
    if (!response.ok) {
      const errorData = data as { error?: string };
      setMessage(errorData.error ?? "Chargement impossible.");
      setBusy(false);
      return;
    }

    if (Array.isArray(data)) {
      setLogs(data);
      setTotal(data.length);
      setPage(targetPage);
      setBusy(false);
      return;
    }

    if ("items" in data && Array.isArray(data.items)) {
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
      setBusy(false);
      return;
    }

    setMessage("Chargement impossible.");
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
          <button type="button" onClick={() => reload(1)} className="btn-main" disabled={busy}>
            Rechercher
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilter("");
              setEventType("");
              void reload(1);
            }}
            className="btn-soft"
            disabled={busy}
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Page: {page}/{pageCount}</span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Total filtres: {total}</span>
          <button type="button" className="btn-soft text-sm" onClick={() => reload(Math.max(1, page - 1))} disabled={busy || page <= 1}>
            Prec.
          </button>
          <button type="button" className="btn-soft text-sm" onClick={() => reload(Math.min(pageCount, page + 1))} disabled={busy || page >= pageCount}>
            Suiv.
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
