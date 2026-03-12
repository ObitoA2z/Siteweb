"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Rehaussement" },
  { href: "/gallery", label: "Galerie" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    getSession().then((session) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-md">
      <div className="shell flex items-center justify-between py-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2" onClick={closeMenu}>
          <span className="text-[#c48fa3]">✦</span>
          Atelier Cils Paris
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#5f4754] md:flex">
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`relative transition hover:text-[#2d1e27] ${
                  active ? "text-[#2d1e27]" : ""
                }`}
              >
                {link.label}
                {active ? (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[#c48fa3]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Actions desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {userEmail !== undefined ? (
            <Link
              href={userEmail ? "/account" : "/account/login"}
              onClick={closeMenu}
              className="btn-soft text-sm"
            >
              {userEmail ? "Mon compte" : "Connexion"}
            </Link>
          ) : (
            <span className="btn-soft text-sm opacity-50">...</span>
          )}
          <Link href="/booking" onClick={closeMenu} className="btn-main text-sm">
            Reserver
          </Link>
        </div>

        {/* Burger menu mobile */}
        <button
          type="button"
          className="flex md:hidden flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span
            className={`block h-0.5 w-5 rounded bg-[#2d1e27] transition-all duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-[#2d1e27] transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-[#2d1e27] transition-all duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen ? (
        <div className="md:hidden border-t border-white/60 bg-white/90 backdrop-blur-md">
          <nav className="shell flex flex-col gap-1 py-4">
            {links.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#ffd7c2]/50 text-[#2d1e27]"
                      : "text-[#5f4754] hover:bg-[#ffd7c2]/20"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 flex gap-2 border-t border-[#2d1e271a] pt-3">
              <Link
                href={userEmail ? "/account" : "/account/login"}
                onClick={closeMenu}
                className="btn-soft flex-1 text-center text-sm"
              >
                {userEmail ? "Mon compte" : "Connexion"}
              </Link>
              <Link href="/booking" onClick={closeMenu} className="btn-main flex-1 text-center text-sm">
                Reserver
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
