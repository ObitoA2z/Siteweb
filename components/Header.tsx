import Link from "next/link";
import { getServerSession } from "next-auth";

import { customerAuthOptions } from "@/lib/customerAuth";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Rehaussement" },
  { href: "/gallery", label: "Galerie" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const session = await getServerSession(customerAuthOptions);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-md">
      <div className="shell flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Atelier Cils Paris
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#5f4754] md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[#2d1e27]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={session?.user ? "/account" : "/account/login"} className="btn-soft text-sm">
            {session?.user ? "Mon compte" : "Connexion"}
          </Link>
          <Link href="/booking" className="btn-main text-sm">
            Reserver
          </Link>
        </div>
      </div>
    </header>
  );
}
