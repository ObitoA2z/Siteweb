"use client";

import { useState } from "react";
import Link from "next/link";

const galleryItems = [
  { id: 1, title: "Avant / Apres 1", subtitle: "Courbure naturelle et regard ouvert", category: "naturel", tag: "Rehaussement naturel" },
  { id: 2, title: "Avant / Apres 2", subtitle: "Rehaussement + teinture intense", category: "intense", tag: "Rehaussement + teinture" },
  { id: 3, title: "Avant / Apres 3", subtitle: "Effet recourbe 6 a 8 semaines", category: "naturel", tag: "Rehaussement classique" },
  { id: 4, title: "Avant / Apres 4", subtitle: "Resultat subtil et elegant", category: "subtil", tag: "Rehaussement subtil" },
  { id: 5, title: "Avant / Apres 5", subtitle: "Cils droits transformes", category: "intense", tag: "Transformation complete" },
  { id: 6, title: "Avant / Apres 6", subtitle: "Routine matin simplifiee", category: "naturel", tag: "Rehaussement naturel" },
  { id: 7, title: "Avant / Apres 7", subtitle: "Regard agrandi et lumineux", category: "intense", tag: "Effet waouh" },
  { id: 8, title: "Avant / Apres 8", subtitle: "Cils fins sublimes", category: "subtil", tag: "Finesse sublimee" },
  { id: 9, title: "Avant / Apres 9", subtitle: "Teinture et rehaussement combines", category: "intense", tag: "Duo teinture" },
];

const categories = [
  { id: "all", label: "Tous" },
  { id: "naturel", label: "Naturel" },
  { id: "intense", label: "Intense" },
  { id: "subtil", label: "Subtil" },
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<(typeof galleryItems)[0] | null>(null);

  const filtered =
    activeCategory === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

  return (
    <div className="shell space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Galerie</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Resultats clientes</h1>
        <p className="text-sm text-[#5f4754] sm:text-base max-w-2xl">
          Decouvre les transformations de nos clientes. Chaque resultat est unique selon la nature
          de tes cils.
        </p>
      </div>

      {/* Filtres — scroll horizontal sur très petit écran */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all min-h-[40px] ${
              activeCategory === cat.id
                ? "bg-[#2d1e27] text-white"
                : "bg-white/70 text-[#5f4754] border border-[#2d1e271a]"
            }`}
          >
            {cat.label}
          </button>
        ))}
        <span className="ml-auto flex-shrink-0 flex items-center text-xs text-[#8a6578] pr-1">
          {filtered.length} photo{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Grille : 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="card overflow-hidden cursor-pointer group"
            onClick={() => setSelectedItem(item)}
          >
            <div className="relative h-44 sm:h-52 bg-gradient-to-br from-[#ffd7c2] via-[#ffece4] to-[#f4bfd4] overflow-hidden">
              <div className="absolute inset-0 bg-[#2d1e27]/0 group-hover:bg-[#2d1e27]/20 transition-all duration-300 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-white font-semibold text-sm bg-[#2d1e27]/70 px-4 py-2 rounded-full">
                  Voir en grand
                </span>
              </div>
              <span className="absolute top-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-[#8a6578]">
                {item.tag}
              </span>
            </div>
            <div className="space-y-1 p-4">
              <h2 className="text-lg font-bold sm:text-xl">{item.title}</h2>
              <p className="text-sm text-[#5f4754]">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Modal — plein écran sur mobile */}
      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="card w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre de fermeture mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-[#2d1e2730]" />
            </div>
            <div className="h-56 sm:h-72 bg-gradient-to-br from-[#ffd7c2] via-[#ffece4] to-[#f4bfd4]" />
            <div className="p-5 sm:p-6 space-y-3">
              <span className="rounded-full bg-[#ffd7c2] px-3 py-1 text-xs font-bold text-[#8a6578]">
                {selectedItem.tag}
              </span>
              <h2 className="text-xl font-bold sm:text-2xl">{selectedItem.title}</h2>
              <p className="text-[#5f4754] text-sm">{selectedItem.subtitle}</p>
              <div className="flex flex-col gap-3 sm:flex-row pt-2">
                <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
                  Reserver ce soin
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="btn-soft w-full sm:w-auto"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card p-5 sm:p-6 text-center space-y-3">
        <h2 className="text-xl font-bold sm:text-2xl">Inspire(e) par nos resultats ?</h2>
        <p className="text-[#5f4754] text-sm">
          Ces photos seront remplacees par tes vraies photos dans{" "}
          <code className="text-xs bg-[#ffd7c2]/40 px-1.5 py-0.5 rounded">
            public/before-after/
          </code>
        </p>
        <Link href="/booking" className="btn-main inline-flex">
          Reserver mon creneau
        </Link>
      </div>
    </div>
  );
}
