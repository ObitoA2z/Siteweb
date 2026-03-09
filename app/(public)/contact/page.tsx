export default function ContactPage() {
  return (
    <div className="shell space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Contact</p>
        <h1 className="text-4xl font-bold">Parlons de ton rendez-vous</h1>
        <p className="max-w-2xl text-[#5f4754]">
          Pour une question rapide, envoie un message. Tu peux aussi reserver directement en ligne.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="card space-y-2 p-6">
          <h2 className="text-2xl font-bold">Coordonnees</h2>
          <p className="text-[#5f4754]">Email: contact@ateliercils.local</p>
          <p className="text-[#5f4754]">Telephone: +33 6 00 00 00 00</p>
          <p className="text-[#5f4754]">Adresse: Paris 11e</p>
        </article>
        <article className="card space-y-2 p-6">
          <h2 className="text-2xl font-bold">Horaires</h2>
          <p className="text-[#5f4754]">Lundi - Vendredi: 09:00 - 19:00</p>
          <p className="text-[#5f4754]">Samedi: 10:00 - 17:00</p>
          <p className="text-[#5f4754]">Dimanche: ferme</p>
        </article>
      </section>
    </div>
  );
}
