"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/time";
import type { Booking } from "@/lib/types";

type Props = {
  initialBookings: Booking[];
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
      prev.map((booking) => (booking.id === bookingId ? { ...booking, status: "cancel_requested" } : booking)),
    );
    setMessage("Demande d'annulation envoyee a l'admin.");
    setBusyBookingId(null);
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-[#5f4754]">Aucune reservation trouvee pour ce compte.</p>;
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="flex flex-col gap-2 rounded-xl border border-[#2d1e2718] bg-white/80 p-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="font-semibold">{booking.serviceName}</p>
            <p className="text-sm text-[#5f4754]">{formatDateTime(booking.startAt)}</p>
            {booking.notes ? <p className="mt-1 text-xs text-[#6b4a59]">Note: {booking.notes}</p> : null}
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-sm font-bold uppercase tracking-wide text-[#5f4754]">{booking.status}</p>
            {booking.status === "confirmed" ? (
              <button
                type="button"
                onClick={() => requestCancellation(booking.id)}
                disabled={busyBookingId === booking.id}
                className="rounded-full border border-[#8f2e4f44] px-3 py-2 text-xs font-semibold text-[#8f2e4f]"
              >
                {busyBookingId === booking.id ? "Envoi..." : "Demander annulation"}
              </button>
            ) : null}
            {booking.status === "cancel_requested" ? (
              <p className="text-xs text-[#8f2e4f]">Demande envoyee, en attente de reponse admin.</p>
            ) : null}
          </div>
        </article>
      ))}

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </div>
  );
}
