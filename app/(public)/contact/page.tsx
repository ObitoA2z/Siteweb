"use client";

import { useState } from "react";
import Link from "next/link";

const infos = [
  { icon: "✉", label: "Email", value: "contact@ateliercils.local", link: "mailto:contact@ateliercils.local" },
  { icon: "📞", label: "Telephone", value: "+33 6 00 00 00 00", link: "tel:+33600000000" },
  { icon: "📍", label: "Adresse", value: "Paris 11e arrondissement", link: null },
];

const horaires = [
  { jour: "Lundi - Vendredi", heure: "09:00 - 19:00", ouvert: true },
  { jour: "Samedi", heure: "10:00 - 17:00", ouvert: true },
  { jour: "Dimanche", heure: "Ferme", ouvert: false },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="shell space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Contact</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Parlons de ton rendez-vous</h1>
        <p className="text-sm text-[#5f4754] sm:text-base max-w-2xl">
          Pour une question rapide, envoie un message. Tu peux aussi reserver directement en ligne
          — c&apos;est rapide et disponible 24h/24.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Infos */}
        <div className="space-y-4">
          <article className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">Coordonnees</h2>
            <div className="space-y-3">
              {infos.map((info) => (
                <div key={info.label} className="flex items-center gap-3">
                  <span className="flex-shrink-0 h-10 w-10 rounded-full bg-[#ffd7c2] flex items-center justify-center text-base">
                    {info.icon}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8a6578]">{info.label}</p>
                    {info.link ? (
                      <a href={info.link} className="text-[#2d1e27] font-semibold hover:text-[#8a6578] text-sm sm:text-base">
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-[#2d1e27] font-semibold text-sm sm:text-base">{info.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card space-y-3 p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">Horaires</h2>
            <div className="space-y-2">
              {horaires.map((h) => (
                <div key={h.jour} className="flex items-center justify-between text-sm">
                  <span className="text-[#5f4754]">{h.jour}</span>
                  <span className={`font-semibold ${h.ouvert ? "text-[#2d1e27]" : "text-[#8a6578]"}`}>
                    {h.heure}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8a6578] pt-1 border-t border-[#2d1e271a]">
              Reservation en ligne disponible 24h/24, 7j/7.
            </p>
          </article>

          <div className="card p-4 sm:p-5 bg-gradient-to-br from-[#fff5f0] to-[#fce8f3] space-y-2">
            <h3 className="font-bold text-sm sm:text-base">Reserver directement</h3>
            <p className="text-xs sm:text-sm text-[#5f4754]">
              Pas besoin d&apos;attendre. Reserve ton creneau en ligne.
            </p>
            <Link href="/booking" className="btn-main w-full text-center mt-1">
              Reserver maintenant
            </Link>
          </div>
        </div>

        {/* Formulaire */}
        <article className="card p-5 sm:p-6 space-y-5">
          <h2 className="text-lg font-bold sm:text-xl">Envoyer un message</h2>

          {sent ? (
            <div className="rounded-xl bg-[#ffd7c2]/40 border border-[#c48fa3]/30 p-6 text-center space-y-2">
              <p className="text-2xl">✓</p>
              <p className="font-bold text-[#2d1e27]">Message envoye !</p>
              <p className="text-sm text-[#5f4754]">
                Merci pour ton message. Nous te repondrons rapidement.
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", message: "" }); }}
                className="btn-soft mt-2 w-full"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sur mobile : 1 col. Sur sm : 2 col */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold">
                    Nom complet <span className="text-[#c48fa3]">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Camille Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold">
                    Email <span className="text-[#c48fa3]">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="camille@exemple.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-semibold">
                  Telephone (optionnel)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-semibold">
                  Message <span className="text-[#c48fa3]">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Ta question ou ta demande..."
                  className="w-full rounded-xl border border-[#2d1e271a] bg-white/70 px-4 py-3 text-sm text-[#2d1e27] placeholder-[#8a6578]/60 resize-none focus:outline-none focus:ring-2 focus:ring-[#c48fa3]/40"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-main w-full">
                {loading ? "Envoi en cours..." : "Envoyer le message"}
              </button>
              <p className="text-xs text-[#8a6578]">
                Tes donnees sont utilisees uniquement pour repondre a ta demande.{" "}
                <a href="/mentions-legales" className="underline hover:text-[#2d1e27]">
                  Mentions legales
                </a>
              </p>
            </form>
          )}
        </article>
      </div>
    </div>
  );
}
