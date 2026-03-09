import Link from "next/link";

import { ServiceCard } from "@/components/ServiceCard";
import { listServices } from "@/lib/db";

export default function HomePage() {
  const services = listServices().slice(0, 3);

  return (
    <div className="shell space-y-14">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-[#2d1e271f] bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7b5a6b]">
            Rehaussement de cils a Paris
          </p>
          <h1 className="text-5xl font-bold leading-tight sm:text-6xl">Sublime ton regard sans extention</h1>
          <p className="max-w-xl text-lg text-[#5f4754]">
            Rehaussement de cils doux, resultat naturel, et prise de rendez-vous en ligne en moins de 2 minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/booking" className="btn-main">
              Reserver un creneau
            </Link>
            <Link href="/services" className="btn-soft">
              Voir les tarifs
            </Link>
          </div>
        </div>
        <div className="card relative overflow-hidden p-8">
          <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-[#ffd7c2]" />
          <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#f4bfd4]" />
          <div className="relative space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Disponibilites rapides</p>
            <h2 className="text-3xl font-bold">Reservation 24h/24</h2>
            <p className="text-[#5f4754]">
              Selectionne ton option de rehaussement de cils, choisis l&apos;horaire qui te convient et confirme instantanement.
            </p>
            <Link href="/booking" className="btn-main mt-2">
              Commencer
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-3xl font-bold">Options rehaussement populaires</h2>
          <Link href="/services" className="text-sm font-semibold text-[#5f4754] underline-offset-4 hover:underline">
            Voir toutes les options
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      <section className="card grid gap-6 p-6 md:grid-cols-3">
        <div>
          <p className="text-3xl font-bold">+50</p>
          <p className="text-sm text-[#5f4754]">clientes satisfaites</p>
        </div>
        <div>
          <p className="text-3xl font-bold">45-60 min</p>
          <p className="text-sm text-[#5f4754]">duree moyenne d&apos;une seance</p>
        </div>
        <div>
          <p className="text-3xl font-bold">Resultat 6-8 semaines</p>
          <p className="text-sm text-[#5f4754]">selon ton cycle naturel</p>
        </div>
      </section>
    </div>
  );
}
