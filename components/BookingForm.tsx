"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CalendarPicker } from "@/components/CalendarPicker";
import { TimeSlots, type SlotOption } from "@/components/TimeSlots";
import { toEuro } from "@/lib/time";
import type { Service } from "@/lib/types";

type Props = {
  services: Service[];
  initialDate: string;
  initialSlots: SlotOption[];
  initialCustomerName?: string;
  initialCustomerEmail?: string;
};

export function BookingForm({
  services,
  initialDate,
  initialSlots,
  initialCustomerName,
  initialCustomerEmail,
}: Props) {
  const router = useRouter();
  const availabilityRequestId = useRef(0);
  const today = useMemo(() => initialDate, [initialDate]);
  const [serviceId, setServiceId] = useState<number>(services[0]?.id ?? 0);
  const [date, setDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<SlotOption[]>(initialSlots);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [formStartedAt] = useState<number>(() => Date.now());
  const [formData, setFormData] = useState({
    customerName: initialCustomerName ?? "",
    customerPhone: "",
    customerEmail: initialCustomerEmail ?? "",
    notes: "",
    website: "",
  });

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const emailLocked = Boolean(initialCustomerEmail);

  const loadAvailability = useCallback(async (nextServiceId: number, nextDate: string) => {
    if (!nextServiceId || !nextDate) {
      setSlots([]);
      setSelectedSlotId(null);
      return;
    }

    const requestId = ++availabilityRequestId.current;
    setLoadingSlots(true);
    setMessage("");

    try {
      const response = await fetch(`/api/availability?serviceId=${nextServiceId}&date=${nextDate}`);
      if (!response.ok) {
        throw new Error("Impossible de recuperer les creneaux.");
      }

      const data = (await response.json()) as SlotOption[];
      if (requestId !== availabilityRequestId.current) {
        return;
      }
      setSlots(data);
      setSelectedSlotId(null);
    } catch (error) {
      if (requestId !== availabilityRequestId.current) {
        return;
      }
      setSlots([]);
      setSelectedSlotId(null);
      setMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      if (requestId === availabilityRequestId.current) {
        setLoadingSlots(false);
      }
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!selectedSlotId) {
      setMessage("Selectionne un creneau.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          notes: formData.notes,
          website: formData.website,
          formStartedAt,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        bookingId?: number;
        waitlistId?: number;
        status?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Erreur lors de la reservation.");
        return;
      }

      if (data.status === "waitlisted") {
        setMessage(data.message ?? "Ajoutee a la liste d'attente.");
        return;
      }

      router.push(`/booking/confirmation?bookingId=${data.bookingId ?? ""}`);
    } catch {
      setMessage("Erreur reseau. Reessaie dans quelques secondes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="service" className="block text-sm font-semibold">
            Option de rehaussement
          </label>
          <select
            id="service"
            value={serviceId}
            onChange={(event) => {
              const nextServiceId = Number(event.target.value);
              setServiceId(nextServiceId);
              void loadAvailability(nextServiceId, date);
            }}
            required
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMin} min - {toEuro(service.priceCents)})
              </option>
            ))}
          </select>
        </div>
        <CalendarPicker
          value={date}
          onChange={(nextDate) => {
            setDate(nextDate);
            void loadAvailability(serviceId, nextDate);
          }}
          min={today}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Creneaux disponibles</h3>
        {loadingSlots ? <p className="text-sm text-[#5f4754]">Chargement...</p> : null}
        {!loadingSlots && slots.length > 0 && slots.length <= 2 ? (
          <p className="text-sm font-semibold text-[#8f2e4f]">Plus que {slots.length} place(s) restante(s) aujourd&apos;hui.</p>
        ) : null}
        {!loadingSlots ? (
          <TimeSlots slots={slots} selectedSlotId={selectedSlotId} onSelect={setSelectedSlotId} />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-semibold">
            Nom complet
          </label>
          <input
            id="name"
            required
            autoComplete="name"
            value={formData.customerName}
            onChange={(event) => setFormData((prev) => ({ ...prev, customerName: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-semibold">
            Telephone
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            value={formData.customerPhone}
            onChange={(event) => setFormData((prev) => ({ ...prev, customerPhone: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            readOnly={emailLocked}
            autoComplete="email"
            value={formData.customerEmail}
            onChange={(event) => setFormData((prev) => ({ ...prev, customerEmail: event.target.value }))}
          />
          {emailLocked ? <p className="text-xs text-[#6b4a59]">Email lie au compte connecte.</p> : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-semibold">
            Notes (optionnel)
          </label>
          <input
            id="notes"
            maxLength={500}
            value={formData.notes}
            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
      </div>

      <div className="hidden" aria-hidden>
        <label htmlFor="website">Ne pas remplir</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
        />
      </div>

      {selectedService ? (
        <p className="text-sm text-[#5f4754]">
          Tu reserves: <strong>{selectedService.name}</strong> ({selectedService.durationMin} min,{" "}
          {toEuro(selectedService.priceCents)})
        </p>
      ) : null}

      {message ? <p className="text-sm font-semibold text-[#8f2e4f]">{message}</p> : null}

      <button type="submit" disabled={submitting || !selectedService} className="btn-main w-full md:w-auto">
        {submitting ? "Reservation en cours..." : "Confirmer la reservation"}
      </button>
    </form>
  );
}
