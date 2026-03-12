"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/time";
import type { Booking } from "@/lib/types";

type Props = {
  initialBookings: Booking[];
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-[#e8a87c]" },
  confirmed: { label: "Confirme", color: "text-[#5f8f6a]" },
  cancel_requested: { label: "Annulation demandee", color: "text-[#8f2e4f]" },
  cancelled: { label: "Annule", color: "text-[#8a6578]" },
  no_show: { label: "Absent", color: "text-[#8a6578]" },
};

export function CustomerBookingsList({ initialBookings }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function requestCancellation(bookingId: number) {
    if (!window.confirm("Envoyer une demande d'annulation pour ce creneau ?")) {
      return;
    }

    setBusyBookingId(bookingId);
    setMessage("");

    const response = await fetch("/api/bookings/cancel-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Demande impossible.");
      setBusyBookingId(null);
      return;
    }

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "cancel_requested" } : booking,
      ),
    );
    setMessage("Demande d'annulation envoyee a l'admin.");
    setBusyBookingId(null);
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-3xl">📅</p>
        <p className="text-sm text-[#5f4754]">Aucune reservation trouvee pour ce compte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const statusInfo = statusLabels[booking.status] ?? {
          label: booking.status,
          color: "text-[#5f4754]",
        };
        return (
          <article
            key={booking.id}
            className="rounded-xl border border-[#2d1e2718] bg-white/80 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm sm:text-base leading-snug">
                {booking.serviceName}
              </p>
              <span
                className={`text-xs font-bold uppercase tracking-wide flex-shrink-0 ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
            </div>

            <p className="text-sm text-[#5f4754]">{formatDateTime(booking.startAt)}</p>

            {booking.notes ? (
              <p className="text-xs text-[#6b4a59] bg-[#ffd7c2]/20 rounded-lg px-3 py-2">
                Note: {booking.notes}
              </p>
            ) : null}

            {booking.status === "confirmed" ? (
              <button
                type="button"
                onClick={() => requestCancellation(booking.id)}
                disabled={busyBookingId === booking.id}
                className="w-full rounded-full border border-[#8f2e4f44] px-3 py-3 text-sm font-semibold text-[#8f2e4f] min-h-[44px]"
              >
                {busyBookingId === booking.id ? "Envoi..." : "Demander l'annulation"}
              </button>
            ) : null}
            {booking.status === "cancel_requested" ? (
              <p className="text-xs text-[#8f2e4f] bg-[#8f2e4f08] rounded-lg px-3 py-2">
                Demande envoyee, en attente de reponse admin.
              </p>
            ) : null}
          </article>
        );
      })}

      {message ? (
        <p className="text-sm font-semibold text-[#5f4754] text-center py-2">{message}</p>
      ) : null}
    </div>
  );
}
