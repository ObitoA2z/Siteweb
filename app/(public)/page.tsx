import Link from "next/link";

import { ServiceCard } from "@/components/ServiceCard";
import { listServices } from "@/lib/db";

const testimonials = [
  {
    name: "Camille R.",
    text: "Resultat incroyable, mes cils sont magnifiques depuis 7 semaines ! Je reviendrai sans hesiter.",
    rating: 5,
    date: "Fevrier 2026",
  },
  {
    name: "Sofia M.",
    text: "Tres professionnelle, ambiance super agreable. Le rehaussement tient parfaitement, je suis ravie.",
    rating: 5,
    date: "Janvier 2026",
  },
  {
    name: "Lea D.",
    text: "J'ai enfin trouve mon salon ! Plus besoin de recourbe-cils le matin. Merci !",
    rating: 5,
    date: "Mars 2026",
  },
];

const steps = [
  {
    number: "01",
    title: "Choisis ta prestation",
    description: "Selectionne l'option rehaussement qui te convient parmi nos offres.",
  },
  {
    number: "02",
    title: "Reserve ton creneau",
    description: "Selectionne une date et un horaire disponible en ligne, 24h/24.",
  },
  {
    number: "03",
    title: "Profite du resultat",
    description: "Seance douce et relaxante. Resultat naturel qui dure 6 a 8 semaines.",
  },
];

const trustBadges = [
  { icon: "✓", label: "100% naturel" },
  { icon: "✓", label: "Sans extensions" },
  { icon: "✓", label: "Resultat 6-8 semaines" },
  { icon: "✓", label: "Produits certifies" },
];

export default function HomePage() {
  const services = listServices().slice(0, 3);

  return (
    <div className="shell space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-[#2d1e271f] bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7b5a6b]">
            Rehaussement de cils a Paris
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Sublime ton regard sans extension
          </h1>
          <p className="text-base text-[#5f4754] sm:text-lg">
            Rehaussement de cils doux, resultat naturel, et prise de rendez-vous en ligne en moins
            de 2 minutes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
              Reserver un creneau
            </Link>
            <Link href="/services" className="btn-soft w-full sm:w-auto text-center">
              Voir les tarifs
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {trustBadges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#5f4754] border border-[#2d1e271a]"
              >
                <span className="text-[#8a6578]">{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-[#ffd7c2]" />
          <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#f4bfd4]" />
          <div className="relative space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
              Disponibilites rapides
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">Reservation 24h/24</h2>
            <p className="text-sm text-[#5f4754]">
              Selectionne ton option, choisis l&apos;horaire qui te convient et confirme
              instantanement.
            </p>
            <ul className="space-y-2 text-sm text-[#5f4754]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8a6578]" />
                Confirmation immediate par email
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8a6578]" />
                Rappel de rendez-vous automatique
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8a6578]" />
                Annulation depuis ton espace client
              </li>
            </ul>
            <Link href="/booking" className="btn-main mt-2 w-full sm:w-auto text-center">
              Commencer
            </Link>
          </div>
        </div>
      </section>

      {/* Comment ca marche */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Processus</p>
          <h2 className="text-2xl font-bold sm:text-3xl">Comment ca marche ?</h2>
          <p className="text-sm text-[#5f4754] sm:text-base">
            Reserver ton soin en 3 etapes simples depuis chez toi.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="card p-5 space-y-2">
              <p className="text-3xl font-bold text-[#ffd7c2]">{step.number}</p>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-[#5f4754]">{step.description}</p>
            </div>
          ))}
        </div>
        <Link href="/booking" className="btn-main w-full sm:w-auto text-center inline-flex">
          Reserver maintenant
        </Link>
      </section>

      {/* Services populaires */}
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Nos offres</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Options populaires</h2>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-[#5f4754] underline-offset-4 hover:underline"
          >
            Voir tout &rarr;
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} featured={i === 1} />
          ))}
        </div>
      </section>

      {/* Chiffres */}
      <section className="card grid grid-cols-2 gap-4 p-5 sm:p-6 md:grid-cols-4">
        <div>
          <p className="text-2xl font-bold sm:text-3xl">+50</p>
          <p className="text-xs text-[#5f4754] sm:text-sm">clientes satisfaites</p>
        </div>
        <div>
          <p className="text-2xl font-bold sm:text-3xl">45-60</p>
          <p className="text-xs text-[#5f4754] sm:text-sm">minutes par seance</p>
        </div>
        <div>
          <p className="text-2xl font-bold sm:text-3xl">6-8 sem.</p>
          <p className="text-xs text-[#5f4754] sm:text-sm">duree du resultat</p>
        </div>
        <div>
          <p className="text-2xl font-bold sm:text-3xl">5★</p>
          <p className="text-xs text-[#5f4754] sm:text-sm">note moyenne</p>
        </div>
      </section>

      {/* Temoignages */}
      <section className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Avis clientes</p>
          <h2 className="text-2xl font-bold sm:text-3xl">Ce qu&apos;elles disent</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {testimonials.map((t) => (
            <article key={t.name} className="card p-5 space-y-3">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} className="text-[#e8a87c]">★</span>
                ))}
              </div>
              <p className="text-[#5f4754] italic leading-relaxed text-sm">&ldquo;{t.text}&rdquo;</p>
              <div className="pt-2 border-t border-[#2d1e271a]">
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-xs text-[#8a6578]">{t.date}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="card p-6 sm:p-10 text-center space-y-4 bg-gradient-to-br from-[#fff5f0] to-[#fce8f3]">
        <h2 className="text-2xl font-bold sm:text-3xl">Prete a sublimer ton regard ?</h2>
        <p className="text-[#5f4754] text-sm sm:text-base max-w-md mx-auto">
          Rejoins nos clientes satisfaites et decouvre le confort d&apos;un regard naturellement
          mis en valeur.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
          <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
            Reserver un creneau
          </Link>
          <Link href="/gallery" className="btn-soft w-full sm:w-auto text-center">
            Voir la galerie
          </Link>
        </div>
      </section>
    </div>
  );
}
