import Link from "next/link";

import { ServiceCard } from "@/components/ServiceCard";
import { listServices } from "@/lib/db";

const perks = [
  {
    icon: "🌿",
    title: "100% naturel",
    description: "Aucune extension, aucun maquillage. Tes propres cils sublimes.",
  },
  {
    icon: "⏱",
    title: "45 a 75 minutes",
    description: "Une seance rapide et relaxante, les yeux fermes.",
  },
  {
    icon: "📅",
    title: "6 a 8 semaines",
    description: "Un resultat qui dure selon ton cycle naturel de cils.",
  },
  {
    icon: "✅",
    title: "Produits certifies",
    description: "Nous utilisons uniquement des produits professionnels certifies.",
  },
];

const included = [
  "Consultation avant seance",
  "Nettoyage et preparation des cils",
  "Application du rehaussement",
  "Fixation et nourrissage",
  "Conseils post-soin personnalises",
  "Email de confirmation et rappel",
];

export default function ServicesPage() {
  const services = listServices();

  return (
    <div className="shell space-y-10 sm:space-y-12">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
          Rehaussement de cils
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Tarifs 100% rehaussement de cils</h1>
        <p className="text-sm text-[#5f4754] sm:text-base max-w-2xl">
          Toutes les options proposees sont dediees au rehaussement de cils uniquement.
        </p>
      </div>

      {/* Services : 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <ServiceCard key={service.id} service={service} featured={i === 1} />
        ))}
      </div>

      {/* Ce qui est inclus */}
      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-xl font-bold sm:text-2xl">Ce qui est inclus dans chaque seance</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {included.map((item) => (
            <div key={item} className="flex items-center gap-2 text-[#5f4754]">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[#ffd7c2] flex items-center justify-center text-xs font-bold text-[#8a6578]">
                ✓
              </span>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Avantages : 2 col mobile, 4 desktop */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold sm:text-2xl">Pourquoi choisir le rehaussement ?</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {perks.map((perk) => (
            <div key={perk.title} className="card p-4 sm:p-5 space-y-2">
              <p className="text-2xl">{perk.icon}</p>
              <h3 className="font-bold text-sm sm:text-base">{perk.title}</h3>
              <p className="text-xs sm:text-sm text-[#5f4754]">{perk.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="card flex flex-col gap-4 p-5 sm:p-6 bg-gradient-to-br from-[#fff5f0] to-[#fce8f3]">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Pret(e) a reserver ?</h2>
          <p className="text-[#5f4754] text-sm mt-1">
            Choisis ton jour et ton heure en ligne. Confirmation immediate.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
            Reserver maintenant
          </Link>
          <Link href="/contact" className="btn-soft w-full sm:w-auto text-center">
            Une question ?
          </Link>
        </div>
      </div>
    </div>
  );
}
