"use client";

import { useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { formatDateTime, todayInParis, zonedLocalToUtcIso } from "@/lib/time";
import type { Service, Slot } from "@/lib/types";

type Props = {
  initialSlots: Slot[];
  services: Service[];
};

export function AdminSlotsManager({ initialSlots, services }: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [dateFilter, setDateFilter] = useState(todayInParis());
  const [serviceFilter, setServiceFilter] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [singleForm, setSingleForm] = useState({
    serviceId: services[0]?.id ?? 0,
    date: todayInParis(),
    startTime: "09:00",
    endTime: "10:00",
  });

  const [generateForm, setGenerateForm] = useState({
    serviceId: services[0]?.id ?? 0,
    date: todayInParis(),
    startTime: "09:00",
    endTime: "18:00",
    stepMin: 60,
  });

  const [deleteDayForm, setDeleteDayForm] = useState({
    date: todayInParis(),
    serviceId: "" as number | "",
    force: false,
  });

  async function fetchSlots() {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (serviceFilter) params.set("serviceId", String(serviceFilter));

    const response = await fetch(`/api/admin/slots?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Impossible de charger les creneaux.");
    }
    setSlots((await response.json()) as Slot[]);
  }

  async function createSingleSlot() {
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({
        serviceId: singleForm.serviceId,
        startAt: zonedLocalToUtcIso(singleForm.date, singleForm.startTime),
        endAt: zonedLocalToUtcIso(singleForm.date, singleForm.endTime),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Creation impossible.");
      setBusy(false);
      return;
    }
    await fetchSlots();
    setMessage("Creneau ajoute.");
    setBusy(false);
  }

  async function generateDay() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({
        mode: "generate_day",
        serviceId: generateForm.serviceId,
        date: generateForm.date,
        startTime: generateForm.startTime,
        endTime: generateForm.endTime,
        stepMin: Number(generateForm.stepMin),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; created?: number; skipped?: number };
    if (!response.ok) {
      setMessage(data.error ?? "Generation impossible.");
      setBusy(false);
      return;
    }
    await fetchSlots();
    setMessage(`Generation terminee: ${data.created ?? 0} crees, ${data.skipped ?? 0} ignores.`);
    setBusy(false);
  }

  async function changeStatus(slotId: number, status: "open" | "blocked") {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ id: slotId, status }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Mise a jour impossible.");
      setBusy(false);
      return;
    }
    await fetchSlots();
    setBusy(false);
  }

  async function remove(slot: Slot) {
    const forcing = slot.status === "booked";
    const confirmation = forcing
      ? "Ce creneau est deja reserve. La reservation sera annulee et le creneau supprime. Continuer ?"
      : "Supprimer ce creneau ?";
    if (!window.confirm(confirmation)) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ id: slot.id, force: forcing }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      hadBooking?: boolean;
      removedBookingStatus?: string | null;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Suppression impossible.");
      setBusy(false);
      return;
    }
    await fetchSlots();
    if (data.hadBooking) {
      setMessage(`Creneau reserve supprime (${data.removedBookingStatus ?? "booking"} annule).`);
    } else {
      setMessage("Creneau supprime.");
    }
    setBusy(false);
  }

  async function removeDay() {
    const confirmation = deleteDayForm.force
      ? "Supprimer tous les creneaux de cette journee, y compris ceux deja reserves (reservations annulees) ?"
      : "Supprimer tous les creneaux de cette journee (hors reservations actives) ?";
    if (!window.confirm(confirmation)) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({
        action: "delete_day",
        date: deleteDayForm.date,
        ...(deleteDayForm.serviceId ? { serviceId: Number(deleteDayForm.serviceId) } : {}),
        force: deleteDayForm.force,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      deleted?: number;
      keptWithBookings?: number;
      removedBookings?: number;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Suppression de journee impossible.");
      setBusy(false);
      return;
    }
    await fetchSlots();
    setMessage(
      `Journee traitee: ${data.deleted ?? 0} creneaux supprimes, ${data.removedBookings ?? 0} reservations supprimees, ${
        data.keptWithBookings ?? 0
      } gardes.`,
    );
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Filtres</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
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
          <button type="button" onClick={fetchSlots} className="btn-soft" disabled={busy}>
            Recharger
          </button>
        </div>
      </article>

      <article className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Creer un creneau</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={singleForm.serviceId}
            onChange={(event) =>
              setSingleForm((prev) => ({ ...prev, serviceId: Number(event.target.value || "0") }))
            }
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={singleForm.date}
            onChange={(event) => setSingleForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="time"
            value={singleForm.startTime}
            onChange={(event) => setSingleForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
          <input
            type="time"
            value={singleForm.endTime}
            onChange={(event) => setSingleForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
          <button type="button" onClick={createSingleSlot} className="btn-main" disabled={busy}>
            Ajouter
          </button>
        </div>
      </article>

      <article className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Generer une journee</h2>
        <div className="grid gap-3 md:grid-cols-6">
          <select
            value={generateForm.serviceId}
            onChange={(event) =>
              setGenerateForm((prev) => ({ ...prev, serviceId: Number(event.target.value || "0") }))
            }
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={generateForm.date}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="time"
            value={generateForm.startTime}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
          <input
            type="time"
            value={generateForm.endTime}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
          <input
            type="number"
            min={15}
            step={5}
            value={generateForm.stepMin}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, stepMin: Number(event.target.value || 0) }))}
          />
          <button type="button" onClick={generateDay} className="btn-main" disabled={busy}>
            Generer
          </button>
        </div>
      </article>

      <article className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Supprimer une journee</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={deleteDayForm.date}
            onChange={(event) => setDeleteDayForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <select
            value={deleteDayForm.serviceId}
            onChange={(event) =>
              setDeleteDayForm((prev) => ({
                ...prev,
                serviceId: event.target.value ? Number(event.target.value) : "",
              }))
            }
          >
            <option value="">Tous les services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <div className="md:col-span-2">
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-[#5f4754]">
              <input
                type="checkbox"
                checked={deleteDayForm.force}
                onChange={(event) => setDeleteDayForm((prev) => ({ ...prev, force: event.target.checked }))}
              />
              Forcer la suppression (annule les reservations liees)
            </label>
            <button
              type="button"
              onClick={removeDay}
              className="rounded-full border border-[#8f2e4f44] px-4 py-2 text-sm font-semibold text-[#8f2e4f]"
              disabled={busy}
            >
              Supprimer la journee
            </button>
          </div>
        </div>
      </article>

      <AdminTable
        headers={["Service", "Debut", "Fin", "Etat", "Actions"]}
        rows={slots.map((slot) => [
          <span key="service">{slot.serviceName ?? slot.serviceId}</span>,
          <span key="start">{formatDateTime(slot.startAt)}</span>,
          <span key="end">{formatDateTime(slot.endAt)}</span>,
          <strong key="status">{slot.status}</strong>,
          <div key="actions" className="flex gap-2">
            {slot.status !== "booked" ? (
              <button
                type="button"
                onClick={() => changeStatus(slot.id, slot.status === "open" ? "blocked" : "open")}
                className="btn-soft text-xs"
                disabled={busy}
              >
                {slot.status === "open" ? "Bloquer" : "Ouvrir"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => remove(slot)}
              className="rounded-full border border-[#8f2e4f44] px-3 py-2 text-xs font-semibold text-[#8f2e4f]"
              disabled={busy}
            >
              Supprimer
            </button>
          </div>,
        ])}
      />

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
