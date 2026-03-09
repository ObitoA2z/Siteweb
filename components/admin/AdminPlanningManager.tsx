"use client";

import { useState } from "react";

import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { todayInParis } from "@/lib/time";
import type { BusinessSettings, ClosedDay, Service } from "@/lib/types";

type Props = {
  initialSettings: BusinessSettings;
  initialClosedDays: ClosedDay[];
  services: Service[];
};

const weekdayLabels: Array<{ value: number; label: string }> = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

export function AdminPlanningManager({ initialSettings, initialClosedDays, services }: Props) {
  const [settings, setSettings] = useState<BusinessSettings>(initialSettings);
  const [closedDays, setClosedDays] = useState<ClosedDay[]>(initialClosedDays);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [closeForm, setCloseForm] = useState({
    date: todayInParis(),
    reason: "",
  });
  const [generateForm, setGenerateForm] = useState({
    serviceId: services[0]?.id ?? 0,
    startDate: todayInParis(),
    days: 7,
    stepMin: 60,
  });

  function toggleDay(value: number) {
    const hasDay = settings.workingDays.includes(value);
    const next = hasDay ? settings.workingDays.filter((day) => day !== value) : [...settings.workingDays, value];
    setSettings((prev) => ({ ...prev, workingDays: next.sort((a, b) => a - b) }));
  }

  async function saveSettings() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/planning", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify(settings),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } | BusinessSettings;
    if (!response.ok || !("openTime" in data)) {
      setMessage(!("openTime" in data) ? (data.error ?? "Sauvegarde impossible.") : "Sauvegarde impossible.");
      setBusy(false);
      return;
    }
    setSettings(data);
    setMessage("Parametres planning sauvegardes.");
    setBusy(false);
  }

  async function addClosedDate() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify(closeForm),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } | ClosedDay;
    if (!response.ok || !("date" in data)) {
      setMessage(!("date" in data) ? (data.error ?? "Ajout impossible.") : "Ajout impossible.");
      setBusy(false);
      return;
    }
    setClosedDays((prev) => {
      const filtered = prev.filter((item) => item.date !== data.date);
      return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date));
    });
    setMessage("Jour ferme enregistre.");
    setBusy(false);
  }

  async function removeClosedDate(date: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/planning", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ date }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Suppression impossible.");
      setBusy(false);
      return;
    }
    setClosedDays((prev) => prev.filter((item) => item.date !== date));
    setMessage("Jour ferme supprime.");
    setBusy(false);
  }

  async function generateWeek() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({
        mode: "generate_week",
        serviceId: generateForm.serviceId,
        startDate: generateForm.startDate,
        days: generateForm.days,
        stepMin: generateForm.stepMin,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      created?: number;
      skipped?: number;
      skippedClosed?: number;
      skippedNonWorking?: number;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Generation impossible.");
      setBusy(false);
      return;
    }

    setMessage(
      `Generation terminee: ${data.created ?? 0} crees, ${data.skipped ?? 0} ignores, ${
        data.skippedClosed ?? 0
      } jours fermes, ${data.skippedNonWorking ?? 0} hors jours ouvres.`,
    );
    setBusy(false);
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Regles de planning</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            Ouverture
            <input
              type="time"
              value={settings.openTime}
              onChange={(event) => setSettings((prev) => ({ ...prev, openTime: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Fermeture
            <input
              type="time"
              value={settings.closeTime}
              onChange={(event) => setSettings((prev) => ({ ...prev, closeTime: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Pause debut
            <input
              type="time"
              value={settings.breakStart}
              onChange={(event) => setSettings((prev) => ({ ...prev, breakStart: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Pause fin
            <input
              type="time"
              value={settings.breakEnd}
              onChange={(event) => setSettings((prev) => ({ ...prev, breakEnd: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Limite RDV / jour
            <input
              type="number"
              min={1}
              max={100}
              value={settings.dailyBookingLimit}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, dailyBookingLimit: Number(event.target.value || "1") }))
              }
            />
          </label>
          <label className="text-sm">
            Overbooking controle
            <input
              type="number"
              min={0}
              max={10}
              value={settings.maxOverbooking}
              onChange={(event) => setSettings((prev) => ({ ...prev, maxOverbooking: Number(event.target.value || "0") }))}
            />
          </label>
          <label className="text-sm">
            Blocage apres annulations
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxCancellationsBeforeBlock}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, maxCancellationsBeforeBlock: Number(event.target.value || "1") }))
              }
            />
          </label>
          <div className="flex items-end">
            <button type="button" className="btn-main w-full" onClick={saveSettings} disabled={busy}>
              Sauver
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Jours travailles</p>
          <div className="flex flex-wrap gap-2">
            {weekdayLabels.map((item) => {
              const active = settings.workingDays.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleDay(item.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    active ? "bg-[#2d1e27] text-white" : "bg-white text-[#2d1e27]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      <article className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Generation hebdomadaire auto</h2>
        <div className="grid gap-3 md:grid-cols-5">
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
            value={generateForm.startDate}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, startDate: event.target.value }))}
          />
          <input
            type="number"
            min={1}
            max={28}
            value={generateForm.days}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, days: Number(event.target.value || "1") }))}
          />
          <input
            type="number"
            min={15}
            max={240}
            step={5}
            value={generateForm.stepMin}
            onChange={(event) => setGenerateForm((prev) => ({ ...prev, stepMin: Number(event.target.value || "15") }))}
          />
          <button type="button" className="btn-main" onClick={generateWeek} disabled={busy}>
            Generer
          </button>
        </div>
        <p className="text-xs text-[#6b4a59]">
          Astuce: 7 jours pour 1 semaine, 14 jours pour 2 semaines. Les jours fermes sont ignores.
        </p>
      </article>

      <article className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Fermetures exceptionnelles</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={closeForm.date}
            onChange={(event) => setCloseForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            value={closeForm.reason}
            onChange={(event) => setCloseForm((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="Motif (vacances...)"
          />
          <div className="md:col-span-2">
            <button type="button" className="btn-soft" onClick={addClosedDate} disabled={busy}>
              Ajouter / Mettre a jour
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {closedDays.length === 0 ? (
            <p className="text-sm text-[#5f4754]">Aucune fermeture configuree.</p>
          ) : (
            closedDays.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between rounded-xl border border-[#2d1e2715] bg-white/80 px-3 py-2"
              >
                <div>
                  <p className="font-semibold">{item.date}</p>
                  <p className="text-xs text-[#6b4a59]">{item.reason || "Sans motif"}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[#8f2e4f44] px-3 py-2 text-xs font-semibold text-[#8f2e4f]"
                  onClick={() => removeClosedDate(item.date)}
                  disabled={busy}
                >
                  Supprimer
                </button>
              </div>
            ))
          )}
        </div>
      </article>

      {message ? <p className="text-sm font-semibold text-[#5f4754]">{message}</p> : null}
    </section>
  );
}
