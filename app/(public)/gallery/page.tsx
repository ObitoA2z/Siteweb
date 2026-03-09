const galleryItems = [
  { title: "Avant / Apres 1", subtitle: "Courbure naturelle et regard ouvert" },
  { title: "Avant / Apres 2", subtitle: "Rehaussement + teinture intense" },
  { title: "Avant / Apres 3", subtitle: "Effet recourbe 6 a 8 semaines" },
  { title: "Avant / Apres 4", subtitle: "Resultat subtil et elegant" },
  { title: "Avant / Apres 5", subtitle: "Cils droits transformes" },
  { title: "Avant / Apres 6", subtitle: "Routine matin simplifiee" },
];

export default function GalleryPage() {
  return (
    <div className="shell space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Galerie</p>
        <h1 className="text-4xl font-bold">Resultats clientes</h1>
        <p className="max-w-2xl text-[#5f4754]">
          Tu peux remplacer ces blocs par tes vraies photos dans `public/before-after/`.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {galleryItems.map((item) => (
          <article key={item.title} className="card overflow-hidden">
            <div className="h-52 bg-gradient-to-br from-[#ffd7c2] via-[#ffece4] to-[#f4bfd4]" />
            <div className="space-y-1 p-4">
              <h2 className="text-xl font-bold">{item.title}</h2>
              <p className="text-sm text-[#5f4754]">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
