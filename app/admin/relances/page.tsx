import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminSession } from "@/lib/auth";
import { getCustomersToReengage } from "@/lib/loyalty";

export default async function AdminRelancesPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const customers = getCustomersToReengage(8);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Clientes à relancer</h1>
        <p className="mt-2 text-sm text-[#5f4754]">
          {customers.length} cliente(s) sans visite depuis 8 semaines ou plus.
        </p>
      </div>

      <AdminNav />

      {customers.length === 0 ? (
        <div className="card p-8 text-center text-[#5f4754]">
          Aucune cliente à relancer pour l'instant. Toutes vos clientes sont revenues récemment !
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((c, i) => (
            <article
              key={`${c.customerEmail}-${i}`}
              className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold">{c.customerName}</p>
                <p className="text-sm text-[#5f4754]">{c.customerEmail}</p>
                {c.customerPhone && (
                  <p className="text-sm text-[#5f4754]">{c.customerPhone}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[#5f4754]">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-[#8a6578]">Dernière visite</p>
                  <p className="font-semibold text-[#2d1e27]">
                    {new Date(c.lastBookingAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs">{c.lastServiceName}</p>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-[#8a6578]">Absence</p>
                  <p className="font-bold text-[#c48fa3]">{c.weeksSinceLastVisit} sem.</p>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-[#8a6578]">Séances totales</p>
                  <p className="font-semibold text-[#2d1e27]">{c.totalConfirmedBookings}</p>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-[#8a6578]">Points fidélité</p>
                  <p className="font-semibold text-[#2d1e27]">{c.loyaltyPoints} pts</p>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`mailto:${c.customerEmail}?subject=On pense a vous !&body=Bonjour ${encodeURIComponent(c.customerName)},%0D%0A%0D%0ACela fait quelques semaines que nous ne vous avons pas vue. Nous serions ravis de vous retrouver !%0D%0A%0D%0AReservez votre prochain rendez-vous sur notre site.%0D%0A%0D%0AAtelier Cils Paris`}
                  className="btn-main text-sm"
                >
                  Envoyer email
                </a>
                {c.customerPhone && (
                  <a
                    href={`tel:${c.customerPhone}`}
                    className="btn-soft text-sm"
                  >
                    Appeler
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
