"use client";

import { useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { getAdminCsrfHeaders } from "@/lib/clientSecurity";
import { toEuro } from "@/lib/time";
import type { Service } from "@/lib/types";

type Props = {
  initialServices: Service[];
};

type ServiceDraft = {
  id: number;
  name: string;
  durationMin: number;
  priceCents: number;
  isActive: boolean;
};

export function AdminServicesManager({ initialServices }: Props) {
  const [services, setServices] = useState<ServiceDraft[]>(
    initialServices.map((service) => ({
      id: service.id,
      name: service.name,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
      isActive: service.isActive,
    })),
  );
  const [newService, setNewService] = useState({
    name: "",
    durationMin: 60,
    priceCents: 5500,
    isActive: true,
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshServices() {
    const response = await fetch("/api/admin/services");
    if (!response.ok) {
      throw new Error("Impossible de charger les prestations.");
    }
    const data = (await response.json()) as Service[];
    setServices(
      data.map((service) => ({
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        isActive: service.isActive,
      })),
    );
  }

  async function create() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify(newService),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Creation impossible.");
      setBusy(false);
      return;
    }
    setNewService({ name: "", durationMin: 60, priceCents: 5500, isActive: true });
    await refreshServices();
    setMessage("Prestation ajoutee.");
    setBusy(false);
  }

  async function save(service: ServiceDraft) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify(service),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Mise a jour impossible.");
      setBusy(false);
      return;
    }
    await refreshServices();
    setMessage("Prestation mise a jour.");
    setBusy(false);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette prestation ?")) {
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getAdminCsrfHeaders() },
      body: JSON.stringify({ id }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Suppression impossible.");
      setBusy(false);
      return;
    }
    await refreshServices();
    setMessage("Prestation supprimee (ou desactivee si historique existant).");
    setBusy(false);
  }

  function updateDraft(id: number, patch: Partial<ServiceDraft>) {
    setServices((prev) => prev.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  }

  return (
    <section className="space-y-6">
      <article className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Nouvelle prestation</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            placeholder="Nom"
            value={newService.name}
            onChange={(event) => setNewService((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            type="number"
            min={15}
            value={newService.durationMin}
            onChange={(event) =>
              setNewService((prev) => ({ ...prev, durationMin: Number(event.target.value || 0) }))
            }
          />
          <input
            type="number"
            min={100}
            step={100}
            value={newService.priceCents}
            onChange={(event) =>
              setNewService((prev) => ({ ...prev, priceCents: Number(event.target.value || 0) }))
            }
          />
          <button type="button" onClick={create} className="btn-main" disabled={busy}>
            Ajouter
          </button>
        </div>
      </article>

      <AdminTable
        headers={["Nom", "Duree", "Prix", "Etat", "Actions"]}
        rows={services.map((service) => [
          <input
            key="name"
            value={service.name}
            onChange={(event) => updateDraft(service.id, { name: event.target.value })}
          />,
          <input
            key="duration"
            type="number"
            value={service.durationMin}
            onChange={(event) => updateDraft(service.id, { durationMin: Number(event.target.value || 0) })}
          />,
          <div key="price" className="space-y-1">
            <input
              type="number"
              value={service.priceCents}
              onChange={(event) => updateDraft(service.id, { priceCents: Number(event.target.value || 0) })}
            />
            <p className="text-xs text-[#6b4a59]">{toEuro(service.priceCents)}</p>
          </div>,
          <select
            key="state"
            value={service.isActive ? "1" : "0"}
            onChange={(event) => updateDraft(service.id, { isActive: event.target.value === "1" })}
          >
            <option value="1">active</option>
            <option value="0">inactive</option>
          </select>,
          <div key="actions" className="flex gap-2">
            <button type="button" onClick={() => save(service)} className="btn-soft text-xs" disabled={busy}>
              Sauver
            </button>
            <button
              type="button"
              onClick={() => remove(service.id)}
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
