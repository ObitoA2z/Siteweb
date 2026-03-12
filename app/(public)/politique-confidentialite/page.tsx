export default function PolitiqueConfidentialitePage() {
  return (
    <div className="shell space-y-8 max-w-3xl">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Legales</p>
        <h1 className="text-4xl font-bold">Politique de confidentialite</h1>
        <p className="text-[#5f4754]">
          Derniere mise a jour : mars 2026. Cette politique explique comment nous collectons et
          utilisons vos donnees personnelles.
        </p>
      </div>

      <div className="space-y-6">
        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Donnees collectees</h2>
          <p className="text-[#5f4754]">
            Lors de l&apos;utilisation du site, nous collectons les informations suivantes :
          </p>
          <ul className="space-y-1 text-[#5f4754] text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Nom et prenom (pour la reservation)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Adresse email (pour la confirmation et les rappels)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Numero de telephone (pour vous contacter si besoin)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Notes de soin (optionnel, saisies librement par le client)
            </li>
          </ul>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Utilisation des donnees</h2>
          <p className="text-[#5f4754]">Vos donnees sont utilisees exclusivement pour :</p>
          <ul className="space-y-1 text-[#5f4754] text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              La gestion et la confirmation de vos reservations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              L&apos;envoi des emails de confirmation et de rappel
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              La communication en cas de modification de rendez-vous
            </li>
          </ul>
          <p className="text-[#5f4754] text-sm">
            Vos donnees ne sont jamais vendues, partagees ou utilisees a des fins publicitaires.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Conservation des donnees</h2>
          <p className="text-[#5f4754]">
            Vos donnees sont conservees pendant la duree necessaire a la gestion de votre compte
            et de l&apos;historique de vos reservations. Vous pouvez demander la suppression de
            vos donnees a tout moment.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Vos droits (RGPD)</h2>
          <p className="text-[#5f4754]">Conformement au Reglement General sur la Protection des Donnees, vous disposez des droits suivants :</p>
          <ul className="space-y-1 text-[#5f4754] text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Droit d&apos;acces a vos donnees
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Droit de rectification des donnees inexactes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Droit a l&apos;effacement (droit a l&apos;oubli)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Droit a la portabilite de vos donnees
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8a6578] mt-0.5">•</span>
              Droit d&apos;opposition au traitement
            </li>
          </ul>
          <p className="text-[#5f4754] text-sm">
            Pour exercer ces droits, contactez-nous par email :{" "}
            <a
              href="mailto:contact@ateliercils.local"
              className="font-semibold text-[#2d1e27] hover:text-[#8a6578]"
            >
              contact@ateliercils.local
            </a>
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-xl font-bold">Securite</h2>
          <p className="text-[#5f4754]">
            Nous mettons en oeuvre des mesures techniques et organisationnelles pour proteger vos
            donnees contre tout acces non autorise, perte ou divulgation. Les mots de passe sont
            stockes de facon chiffree et ne sont jamais accessibles en clair.
          </p>
        </section>
      </div>
    </div>
  );
}
