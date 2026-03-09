import type { Service } from "@/lib/types";
import { toEuro } from "@/lib/time";

type Props = {
  service: Service;
};

export function ServiceCard({ service }: Props) {
  return (
    <article className="card p-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Option rehaussement</p>
      <h3 className="text-2xl font-bold">{service.name}</h3>
      <p className="mt-3 text-[#5f4754]">
        Duree: <strong>{service.durationMin} min</strong>
      </p>
      <p className="text-[#5f4754]">
        Tarif: <strong>{toEuro(service.priceCents)}</strong>
      </p>
    </article>
  );
}
