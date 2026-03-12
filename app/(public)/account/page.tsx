import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerBookingsList } from "@/components/account/CustomerBookingsList";
import { CustomerSignOutButton } from "@/components/auth/CustomerSignOutButton";
import { customerAuthOptions } from "@/lib/customerAuth";
import { listBookingsByCustomerEmail } from "@/lib/db";

export default async function CustomerAccountPage() {
  const session = await getServerSession(customerAuthOptions);
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account");
  }

  const customerEmail = session.user.email ?? "";
  const bookings = customerEmail ? listBookingsByCustomerEmail(customerEmail) : [];

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const cancelledCount = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "cancel_requested",
  ).length;

  const upcomingBookings = bookings.filter(
    (b) =>
      (b.status === "confirmed" || b.status === "pending") &&
      new Date(b.startAt) > new Date(),
  );
  const nextBooking = upcomingBookings.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  )[0];

  return (
    <div className="shell space-y-5 sm:space-y-6">
      {/* Header compte */}
      <section className="card mx-auto max-w-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Mon compte</p>
            <h1 className="text-2xl font-bold sm:text-3xl truncate">
              Bienvenue {session.user.name || "cliente"}
            </h1>
            <p className="text-[#5f4754] text-sm truncate">{session.user.email}</p>
          </div>
          <CustomerSignOutButton />
        </div>

        {/* Stats : 3 colonnes egales */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-[#2d1e271a]">
          <div className="text-center p-2 rounded-xl bg-white/40">
            <p className="text-xl font-bold sm:text-2xl">{bookings.length}</p>
            <p className="text-xs text-[#8a6578] mt-0.5">Total</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/40">
            <p className="text-xl font-bold sm:text-2xl">{confirmedCount}</p>
            <p className="text-xs text-[#8a6578] mt-0.5">Confirmees</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/40">
            <p className="text-xl font-bold sm:text-2xl">{pendingCount}</p>
            <p className="text-xs text-[#8a6578] mt-0.5">En attente</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/booking" className="btn-main w-full sm:w-auto text-center">
            Reserver un creneau
          </Link>
          <Link href="/services" className="btn-soft w-full sm:w-auto text-center">
            Voir les prestations
          </Link>
        </div>
      </section>

      {/* Prochain RDV */}
      {nextBooking ? (
        <section className="card mx-auto max-w-3xl p-5 sm:p-6 bg-gradient-to-br from-[#fff5f0] to-[#fce8f3] space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">
            Prochain rendez-vous
          </p>
          <h2 className="text-lg font-bold sm:text-xl">{nextBooking.serviceName}</h2>
          <p className="text-[#5f4754] text-sm sm:text-base">
            {new Date(nextBooking.startAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-xs text-[#8a6578]">
            Rappel : evite eau et maquillage 24h apres la seance pour fixer le resultat.
          </p>
        </section>
      ) : null}

      {/* Historique */}
      <section className="card mx-auto max-w-3xl space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold sm:text-2xl">Mes reservations</h2>
          {cancelledCount > 0 ? (
            <p className="text-xs text-[#8a6578]">{cancelledCount} annulee(s)</p>
          ) : null}
        </div>
        <CustomerBookingsList initialBookings={bookings} />
      </section>

      {/* Aide */}
      <section className="card mx-auto max-w-3xl p-4 sm:p-5 space-y-2">
        <h3 className="font-bold text-sm sm:text-base">Besoin d&apos;aide ?</h3>
        <p className="text-sm text-[#5f4754]">
          Pour toute question sur une reservation, contacte-nous.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row pt-1">
          <Link href="/contact" className="btn-soft w-full sm:w-auto text-center text-sm">
            Nous contacter
          </Link>
          <Link href="/faq" className="btn-soft w-full sm:w-auto text-center text-sm">
            FAQ
          </Link>
        </div>
      </section>
    </div>
  );
}
