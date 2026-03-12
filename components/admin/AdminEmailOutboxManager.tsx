"use client";

import { useMemo, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { formatDateTime } from "@/lib/time";
import type { EmailOutboxPage, EmailOutboxStatus } from "@/lib/types";

type Props = {
  initialPage: EmailOutboxPage;
};

const statusOptions: Array<EmailOutboxStatus | ""> = ["", "pending", "retry", "sending", "sent", "failed"];

export function AdminEmailOutboxManager({ initialPage }: Props) {
  const [pageData, setPageData] = useState<EmailOutboxPage>(initialPage);
  const [statusFilter, setStatusFilter] = useState<EmailOutboxStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
  }, [pageData.total, pageData.pageSize]);

  async function loadPage(nextPage: number) {
    setBusy(true);
    setMessage("");

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageData.pageSize));
    if (statusFilter) {
      params.set("status", statusFilter);
    }

    const response = await fetch(`/api/admin/emails?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as { error?: string } | EmailOutboxPage;
    if (!response.ok || !("items" in data)) {
      setMessage("Chargement impossible.");
      setBusy(false);
      return;
    }

    setPageData(data);
    setBusy(false);
  }

  async function retryEmail(id: number) {
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ action: "retry", id }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Relance impossible.");
      setBusy(false);
      return;
    }

    await loadPage(pageData.page);
    setMessage("Email relance.");
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Outbox email</h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as EmailOutboxStatus | "")}
            >
              {statusOptions.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "Tous les statuts"}
                </option>
              ))}
            </select>
            <button type="button" className="btn-main text-sm" onClick={() => loadPage(1)} disabled={busy}>
              Rechercher
            </button>
          </div>
        </div>

        <p className="text-sm text-[#5f4754]">
          Total: {pageData.total} email(s) - page {pageData.page}/{pageCount}
        </p>
      </article>

      <AdminTable
        headers={["ID", "Categorie", "Destinataire", "Sujet", "Statut", "Tentatives", "Prochain essai", "Actions"]}
        rows={pageData.items.map((item) => [
          <span key="id" className="text-xs font-semibold">
            #{item.id}
          </span>,
          <span key="category" className="text-xs">
            {item.category}
          </span>,
          <span key="recipient" className="text-xs">
            {item.recipient}
          </span>,
          <span key="subject" className="text-xs">
            {item.subject}
          </span>,
          <strong key="status" className="text-xs uppercase">
            {item.status}
          </strong>,
          <span key="attempts" className="text-xs">
            {item.attemptCount}/{item.maxAttempts}
          </span>,
          <span key="nextAttempt" className="text-xs">
            {formatDateTime(item.nextAttemptAt)}
          </span>,
          <div key="actions" className="flex gap-2">
            {item.status === "failed" || item.status === "retry" ? (
              <button type="button" className="btn-soft text-xs" onClick={() => retryEmail(item.id)} disabled={busy}>
                Relancer
              </button>
            ) : (
              <span className="text-xs text-[#6b4a59]">-</span>
            )}
          </div>,
        ])}
      />

      <div className="flex items-center gap-2">
        <button type="button" className="btn-soft text-sm" onClick={() => loadPage(Math.max(1, pageData.page - 1))} disabled={busy || pageData.page <= 1}>
          Prec.
        </button>
        <button type="button" className="btn-soft text-sm" onClick={() => loadPage(Math.min(pageCount, pageData.page + 1))} disabled={busy || pageData.page >= pageCount}>
          Suiv.
        </button>
      </div>

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
