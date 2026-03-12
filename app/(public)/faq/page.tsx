"use client";

import { useState } from "react";
import Link from "next/link";

const faqCategories = [
  {
    id: "soin",
    label: "Le soin",
    faqs: [
      { question: "Combien de temps dure le rehaussement ?", answer: "En moyenne 6 a 8 semaines selon la nature de tes cils et ton cycle naturel." },
      { question: "Combien de temps dure la seance ?", answer: "La prestation dure generalement entre 45 et 75 minutes selon le type de rehaussement choisi." },
      { question: "Le rehaussement de cils est-il douloureux ?", answer: "Non. Le rehaussement de cils est entierement doux et se fait yeux fermes. C'est une experience relaxante." },
      { question: "Faites-vous uniquement du rehaussement de cils ?", answer: "Oui. Le salon est specialise uniquement dans le rehaussement de cils (avec options comme la teinture selon la prestation)." },
      { question: "Combien de temps attendre entre deux rehaussements ?", answer: "Il est recommande d'attendre environ 6 a 8 semaines entre deux seances pour respecter le cycle naturel des cils." },
    ],
  },
  {
    id: "apres",
    label: "Apres la seance",
    faqs: [
      { question: "Puis-je maquiller mes cils apres la seance ?", answer: "Oui, apres 24h. Evite eau, vapeur et mascara pendant le premier jour pour fixer le resultat." },
      { question: "Que faut-il eviter pendant les 24h apres la seance ?", answer: "Evite eau chaude, vapeur, sauna, piscine, demaquillant gras et frottements pour stabiliser le resultat." },
      { question: "Mes cils peuvent-ils etre abimes ?", answer: "Non, si le protocole est bien respecte. Nos produits sont doux et certifies pour proteger la sante des cils." },
    ],
  },
  {
    id: "profil",
    label: "Profil",
    faqs: [
      { question: "Puis-je faire un rehaussement si j'ai les yeux sensibles ?", answer: "Oui dans beaucoup de cas, mais previens-nous avant la seance. En cas d'allergie connue, demande l'avis d'un professionnel de sante." },
      { question: "Peut-on faire un rehaussement pendant la grossesse ?", answer: "En principe oui, mais la sensibilite et la tenue peuvent varier. Si tu as un doute, valide avec ton medecin avant la seance." },
      { question: "A partir de quel age ?", answer: "La prestation est reservee aux personnes majeures (18 ans et plus)." },
      { question: "Je porte des lentilles, est-ce possible ?", answer: "Oui. Par confort, il est conseille de retirer tes lentilles pendant la seance puis de les remettre ensuite." },
    ],
  },
  {
    id: "reservation",
    label: "Reservation",
    faqs: [
      { question: "Comment se passe la reservation ?", answer: "Tu choisis une prestation et un creneau, puis tu envoies ta demande. La reservation passe en attente, puis l'admin la confirme et tu recois un email." },
      { question: "Comment savoir si ma reservation est confirmee ?", answer: "Tu recois un email de demande en attente, puis un second email des que l'admin confirme ton creneau." },
      { question: "Puis-je voir mes reservations depuis mon compte ?", answer: "Oui. Connecte-toi a ton compte client pour voir tes reservations, leurs statuts et faire une demande d'annulation." },
      { question: "Comment annuler un rendez-vous ?", answer: "Depuis ton compte client, tu peux envoyer une demande d'annulation pour un creneau confirme. L'admin valide ensuite la demande." },
      { question: "Que se passe-t-il en cas de retard ?", answer: "En cas de retard important, la seance peut etre raccourcie ou reportee. Previens-nous si possible." },
    ],
  },
];

function FaqAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left min-h-[52px]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-bold sm:text-base">{question}</span>
        <span
          className={`flex-shrink-0 h-7 w-7 rounded-full bg-[#ffd7c2] flex items-center justify-center text-[#8a6578] font-bold text-lg transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-[#5f4754] text-sm leading-relaxed border-t border-[#2d1e271a] pt-3">
          {answer}
        </div>
      ) : null}
    </article>
  );
}

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState("soin");
  const current = faqCategories.find((c) => c.id === activeCategory) ?? faqCategories[0];

  return (
    <div className="shell space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">FAQ</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Questions frequentes</h1>
        <p className="text-sm text-[#5f4754] sm:text-base max-w-2xl">
          Retrouve les reponses aux questions les plus posees. Si tu as d&apos;autres
          interrogations, contacte-nous.
        </p>
      </div>

      {/* Onglets — scroll horizontal sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {faqCategories.map((cat) => (
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
            <span className="ml-1 opacity-60 text-xs">({cat.faqs.length})</span>
          </button>
        ))}
      </div>

      {/* Accordeons */}
      <div className="space-y-2 sm:space-y-3">
        {current.faqs.map((faq) => (
          <FaqAccordion key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </div>

      {/* CTA */}
      <div className="card p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">Tu n&apos;as pas trouve ta reponse ?</h2>
          <p className="text-[#5f4754] text-sm mt-1">
            Contacte-nous directement, on te repondra rapidement.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-shrink-0">
          <Link href="/contact" className="btn-soft w-full sm:w-auto text-center">
            Nous contacter
          </Link>
          <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
            Reserver
          </Link>
        </div>
      </div>
    </div>
  );
}
