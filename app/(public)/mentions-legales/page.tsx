export default function MentionsLegalesPage() {
  return (
    <div className="shell space-y-8 max-w-3xl">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Legales</p>
        <h1 className="text-4xl font-bold">Mentions legales</h1>
        <p className="text-[#5f4754]">Conformement aux dispositions legales en vigueur.</p>
      </div>

      <div className="space-y-6">
        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Editeur du site</h2>
          <div className="space-y-1 text-[#5f4754]">
            <p><strong>Nom :</strong> Atelier Cils Paris</p>
            <p><strong>Adresse :</strong> Paris 11e arrondissement, France</p>
            <p><strong>Email :</strong> contact@ateliercils.local</p>
            <p><strong>Telephone :</strong> +33 6 00 00 00 00</p>
            <p><strong>Statut :</strong> Entreprise individuelle / Auto-entrepreneur</p>
          </div>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Hebergement</h2>
          <p className="text-[#5f4754]">
            Ce site est heberge par un prestataire tiers. Les coordonnees de l&apos;hebergeur sont
            disponibles sur demande a l&apos;adresse email ci-dessus.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Propriete intellectuelle</h2>
          <p className="text-[#5f4754]">
            L&apos;ensemble du contenu de ce site (textes, images, logos) est la propriete
            exclusive d&apos;Atelier Cils Paris, sauf mention contraire. Toute reproduction
            sans autorisation est interdite.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Donnees personnelles</h2>
          <p className="text-[#5f4754]">
            Les donnees collectees lors de la reservation (nom, email, telephone) sont utilisees
            uniquement pour la gestion des rendez-vous. Conformement au RGPD, vous disposez
            d&apos;un droit d&apos;acces, de rectification et de suppression de vos donnees.
            Pour exercer ces droits, contactez-nous a contact@ateliercils.local.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Cookies</h2>
          <p className="text-[#5f4754]">
            Ce site utilise des cookies strictement necessaires au fonctionnement de
            l&apos;espace client (authentification). Aucun cookie publicitaire n&apos;est utilise.
          </p>
        </section>
      </div>
    </div>
  );
}
