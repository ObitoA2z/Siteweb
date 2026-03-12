import Link from "next/link";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Nos prestations" },
  { href: "/gallery", label: "Galerie" },
  { href: "/booking", label: "Reserver" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/mentions-legales", label: "Mentions legales" },
  { href: "/politique-confidentialite", label: "Confidentialite" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/70 bg-white/70">
      <div className="shell py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Colonne brand */}
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <span className="text-[#c48fa3]">✦</span>
              Atelier Cils Paris
            </p>
            <p className="text-sm text-[#5f4754] max-w-xs">
              Specialiste du rehaussement de cils a Paris. Resultat naturel, sans extensions,
              durable 6 a 8 semaines.
            </p>
            <div className="flex gap-3 pt-1">
              <span
                className="h-8 w-8 rounded-full bg-[#ffd7c2]/60 flex items-center justify-center text-[#8a6578] text-sm font-bold"
                title="Instagram"
              >
                ig
              </span>
              <span
                className="h-8 w-8 rounded-full bg-[#ffd7c2]/60 flex items-center justify-center text-[#8a6578] text-sm font-bold"
                title="TikTok"
              >
                tt
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
              Navigation
            </p>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#5f4754] hover:text-[#2d1e27] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact rapide */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
              Contact
            </p>
            <div className="space-y-2 text-sm text-[#5f4754]">
              <p>
                <a
                  href="mailto:contact@ateliercils.local"
                  className="hover:text-[#2d1e27] transition-colors"
                >
                  contact@ateliercils.local
                </a>
              </p>
              <p>
                <a href="tel:+33600000000" className="hover:text-[#2d1e27] transition-colors">
                  +33 6 00 00 00 00
                </a>
              </p>
              <p>Paris 11e arrondissement</p>
            </div>
            <div className="space-y-1 text-xs text-[#8a6578] pt-2">
              <p>Lun - Ven : 09:00 - 19:00</p>
              <p>Samedi : 10:00 - 17:00</p>
              <p>Dimanche : ferme</p>
            </div>
          </div>
        </div>

        {/* Barre bas */}
        <div className="mt-8 pt-5 border-t border-[#2d1e271a] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#8a6578]">
          <p>&copy; {new Date().getFullYear()} Atelier Cils Paris — Tous droits reserves.</p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#2d1e27] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
