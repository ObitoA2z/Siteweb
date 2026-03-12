import Link from "next/link";

import type { Service } from "@/lib/types";
import { toEuro } from "@/lib/time";

type Props = {
  service: Service;
  featured?: boolean;
};

export function ServiceCard({ service, featured }: Props) {
  return (
    <article className={`card p-5 sm:p-6 space-y-4 relative ${featured ? "ring-2 ring-[#c48fa3]" : ""}`}>
      {featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#c48fa3] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white whitespace-nowrap">
          Populaire
        </span>
      ) : null}
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
          Option rehaussement
        </p>
        <h3 className="text-xl font-bold sm:text-2xl">{service.name}</h3>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[#5f4754]">
          <span className="text-[#8a6578]">⏱</span>
          <span className="text-sm">
            Duree: <strong>{service.durationMin} min</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#5f4754]">
          <span className="text-[#8a6578]">€</span>
          <span className="text-sm">
            Tarif: <strong className="text-lg text-[#2d1e27]">{toEuro(service.priceCents)}</strong>
          </span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm text-[#5f4754]">
        <li className="flex items-center gap-2">
          <span className="text-[#8a6578] flex-shrink-0">✓</span> Resultat naturel et durable
        </li>
        <li className="flex items-center gap-2">
          <span className="text-[#8a6578] flex-shrink-0">✓</span> Seance yeux fermes, sans douleur
        </li>
        <li className="flex items-center gap-2">
          <span className="text-[#8a6578] flex-shrink-0">✓</span> Produits certifies
        </li>
      </ul>
      <Link
        href="/booking"
        className={`${featured ? "btn-main" : "btn-soft"} w-full text-center`}
      >
        Reserver cette option
      </Link>
    </article>
  );
}
