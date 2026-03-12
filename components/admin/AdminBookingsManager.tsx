"use client";

import { useMemo, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { formatDateTime } from "@/lib/time";
import type { Booking, BookingStatus, Service } from "@/lib/types";

type Props = {
  initialBookings: Booking[];
  services: Service[];
};

function toCsvValue(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  const escaped = raw.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function AdminBookingsManager({ initialBookings, services }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [dateFilter, setDateFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [queryFilter, setQueryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(initialBookings.length);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const counts = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === "pending").length,
      confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
      cancelRequested: bookings.filter((booking) => booking.status === "cancel_requested").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      noShow: bookings.filter((booking) => booking.status === "no_show").length,
    }),
    [bookings],
  );

  async function reload(targetPage = page) {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (serviceFilter) params.set("serviceId", String(serviceFilter));
    if (statusFilter) params.set("status", statusFilter);
    if (queryFilter.trim()) params.set("q", queryFilter.trim());
    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));

    const response = await fetch(`/api/admin/bookings?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as
      | { error?: string }
      | Booking[]
      | { items: Booking[]; total: number; page: number; pageSize: number };

    if (!response.ok) {
      const errorData = data as { error?: string };
      setMessage(errorData.error ?? "Chargement impossible.");
      setBusy(false);
      return;
    }

    if (Array.isArray(data)) {
      setBookings(data);
      setTotal(data.length);
      setPage(targetPage);
      setBusy(false);
      return;
    }

    if ("items" in data && Array.isArray(data.items)) {
      setBookings(data.items);
      setTotal(data.total);
      setPage(data.page);
      setBusy(false);
      return;
    }

    setMessage("Chargement impossible.");
    setBusy(false);
  }

  function exportCsv() {
    const headers = [
      "booking_id",
      "status",
      "client_nom",
      "client_phone",
      "client_email",
      "service",
      "start_at_utc",
      "created_at",
      "notes",
    ];
    const rows = bookings.map((booking) => [
      booking.id,
      booking.status,
      booking.customerName,
      booking.customerPhone,
      booking.customerEmail,
      booking.serviceName,
      booking.startAt,
      booking.createdAt,
      booking.notes,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => toCsvValue(cell as string | number | null | undefined)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservations-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function cancel(bookingId: number) {
    if (!window.confirm("Annuler cette reservation ?")) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ action: "cancel", bookingId }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Annulation impossible.");
      setBusy(false);
      return;
    }
    await reload(page);
    setMessage("Reservation annulee.");
    setBusy(false);
  }

  async function confirmBookingAction(bookingId: number) {
    if (!window.confirm("Confirmer cette reservation ?")) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ action: "confirm", bookingId }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Confirmation impossible.");
      setBusy(false);
      return;
    }
    await reload(page);
    setMessage("Reservation confirmee.");
    setBusy(false);
  }

  async function rejectCancelRequest(bookingId: number) {
    if (!window.confirm("Refuser la demande d'annulation de cette reservation ?")) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ action: "reject_cancel_request", bookingId }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Action impossible.");
      setBusy(false);
      return;
    }
    await reload(page);
    setMessage("Demande d'annulation refusee.");
    setBusy(false);
  }

  async function markNoShow(bookingId: number) {
    if (!window.confirm("Marquer cette reservation en no_show ?")) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ action: "mark_no_show", bookingId }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Action impossible.");
      setBusy(false);
      return;
    }
    await reload(page);
    setMessage("Reservation marquee no_show.");
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Filtres et export</h2>
          <button type="button" onClick={exportCsv} className="btn-soft text-sm" disabled={busy || bookings.length === 0}>
            Export CSV
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            placeholder="Date"
          />
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value ? Number(event.target.value) : "")}
          >
            <option value="">Tous les services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BookingStatus | "")}>
            <option value="">Tous les statuts</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="cancel_requested">cancel_requested</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
          <input
            value={queryFilter}
            onChange={(event) => setQueryFilter(event.target.value)}
            placeholder="Recherche nom / email / telephone"
          />
          <button type="button" onClick={() => reload(1)} className="btn-main" disabled={busy}>
            Rechercher
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Page: {page}/{pageCount}</span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Total filtres: {total}</span>
          <span className="rounded-full bg-[#fff4e9] px-3 py-1 font-semibold">Pending: {counts.pending}</span>
          <span className="rounded-full bg-[#eaf8ff] px-3 py-1 font-semibold">Confirmed: {counts.confirmed}</span>
          <span className="rounded-full bg-[#ffeef2] px-3 py-1 font-semibold">
            Cancel requested: {counts.cancelRequested}
          </span>
          <span className="rounded-full bg-[#f2f2f2] px-3 py-1 font-semibold">Cancelled: {counts.cancelled}</span>
          <span className="rounded-full bg-[#f3eefc] px-3 py-1 font-semibold">No show: {counts.noShow}</span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-soft text-sm" onClick={() => reload(Math.max(1, page - 1))} disabled={busy || page <= 1}>
            Prec.
          </button>
          <button type="button" className="btn-soft text-sm" onClick={() => reload(Math.min(pageCount, page + 1))} disabled={busy || page >= pageCount}>
            Suiv.
          </button>
        </div>
      </article>

      <AdminTable
        headers={["ID", "Client", "Contact", "Service", "Creneau", "Statut", "Actions"]}
        rows={bookings.map((booking) => [
          <span key="id" className="text-xs font-semibold">
            #{booking.id}
          </span>,
          <div key="client">
            <p className="font-semibold">{booking.customerName}</p>
            {booking.notes ? <p className="text-xs text-[#6b4a59]">{booking.notes}</p> : null}
          </div>,
          <div key="contact">
            <p>{booking.customerPhone}</p>
            {booking.customerEmail ? <p className="text-xs">{booking.customerEmail}</p> : null}
          </div>,
          <span key="service">{booking.serviceName}</span>,
          <span key="slot">{formatDateTime(booking.startAt)}</span>,
          <strong key="status" className="capitalize">
            {booking.status}
          </strong>,
          <div key="actions" className="flex flex-wrap gap-2">
            {booking.status === "pending" ? (
              <button
                type="button"
                onClick={() => confirmBookingAction(booking.id)}
                className="btn-soft text-xs"
                disabled={busy}
              >
                Confirmer
              </button>
            ) : null}
            {booking.status === "cancel_requested" ? (
              <button
                type="button"
                onClick={() => rejectCancelRequest(booking.id)}
                className="btn-soft text-xs"
                disabled={busy}
              >
                Refuser annulation
              </button>
            ) : null}
            {booking.status === "confirmed" ? (
              <button type="button" onClick={() => markNoShow(booking.id)} className="btn-soft text-xs" disabled={busy}>
                No-show
              </button>
            ) : null}
            {booking.status !== "cancelled" ? (
              <button
                type="button"
                onClick={() => cancel(booking.id)}
                className="rounded-full border border-[#8f2e4f44] px-3 py-2 text-xs font-semibold text-[#8f2e4f]"
                disabled={busy}
              >
                {booking.status === "cancel_requested" ? "Valider annulation" : "Annuler"}
              </button>
            ) : (
              <span className="text-xs text-[#6b4a59]">Deja annulee</span>
            )}
          </div>,
        ])}
      />

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
