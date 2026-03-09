const faqs = [
  {
    question: "Combien de temps dure le rehaussement ?",
    answer: "En moyenne 6 a 8 semaines selon la nature de tes cils.",
  },
  {
    question: "Combien de temps dure la seance ?",
    answer:
      "La prestation dure generalement entre 45 et 75 minutes selon le type de rehaussement choisi.",
  },
  {
    question: "Faites-vous uniquement du rehaussement de cils ?",
    answer:
      "Oui. Le salon est specialise uniquement dans le rehaussement de cils (avec options comme la teinture selon la prestation).",
  },
  {
    question: "Puis-je maquiller mes cils apres la seance ?",
    answer: "Oui, apres 24h. Evite eau/vapeur/mascara pendant le premier jour.",
  },
  {
    question: "Que faut-il eviter pendant les 24h apres la seance ?",
    answer:
      "Evite eau chaude, vapeur, sauna, piscine, demaquillant gras et frottements pour stabiliser le resultat.",
  },
  {
    question: "Le rehaussement de cils est-il douloureux ?",
    answer: "Non. Le rehaussement de cils est doux et se fait yeux fermes.",
  },
  {
    question: "Puis-je faire un rehaussement si j'ai les yeux sensibles ?",
    answer:
      "Oui dans beaucoup de cas, mais previens-nous avant la seance. En cas d'allergie connue ou de pathologie oculaire, demande l'avis d'un professionnel de sante.",
  },
  {
    question: "Peut-on faire un rehaussement pendant la grossesse ?",
    answer:
      "En principe oui, mais la sensibilite et la tenue peuvent varier. Si tu as un doute, valide avec ton medecin.",
  },
  {
    question: "A partir de quel age peut-on faire un rehaussement ?",
    answer: "La prestation est reservee aux personnes majeures.",
  },
  {
    question: "Je porte des lentilles, est-ce possible ?",
    answer:
      "Oui. Par confort, il est conseille de retirer tes lentilles pendant la seance puis de les remettre ensuite.",
  },
  {
    question: "Comment se passe la reservation ?",
    answer:
      "Tu choisis une prestation et un creneau, puis tu envoies ta demande. La reservation passe en attente, puis l'admin la confirme.",
  },
  {
    question: "Comment savoir si ma reservation est confirmee ?",
    answer:
      "Tu recois un email de demande en attente, puis un second email des que l'admin confirme ton creneau.",
  },
  {
    question: "Puis-je voir mes reservations depuis mon compte ?",
    answer:
      "Oui. Connecte-toi a ton compte client pour voir tes reservations, leurs statuts et faire une demande d'annulation.",
  },
  {
    question: "Comment annuler un rendez-vous ?",
    answer:
      "Depuis ton compte client, tu peux envoyer une demande d'annulation pour un creneau confirme. L'admin valide ensuite la demande.",
  },
  {
    question: "Que se passe-t-il en cas de retard ?",
    answer:
      "En cas de retard important, la seance peut etre raccourcie ou reportee pour ne pas impacter les clientes suivantes.",
  },
  {
    question: "Combien de temps attendre entre deux rehaussements ?",
    answer:
      "Il est recommande d'attendre environ 6 a 8 semaines entre deux seances pour respecter le cycle naturel des cils.",
  },
];

export default function FaqPage() {
  return (
    <div className="shell space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">FAQ</p>
        <h1 className="text-4xl font-bold">Questions frequentes</h1>
      </div>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <article key={faq.question} className="card p-5">
            <h2 className="text-xl font-bold">{faq.question}</h2>
            <p className="mt-2 text-[#5f4754]">{faq.answer}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
