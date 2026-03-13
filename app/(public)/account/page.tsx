import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerBookingsList } from "@/components/account/CustomerBookingsList";
import { CustomerSignOutButton } from "@/components/auth/CustomerSignOutButton";
import { customerAuthOptions } from "@/lib/customerAuth";
import { getCustomerUserByEmail, listBookingsByCustomerEmail } from "@/lib/db";
import {
  getLoyaltyStatus,
  getOrCreateReferralCode,
  LOYALTY_REWARD_DISCOUNT,
  LOYALTY_REWARD_THRESHOLD,
} from "@/lib/loyalty";

export default async function CustomerAccountPage() {
  const session = await getServerSession(customerAuthOptions);
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account");
  }

  const customerEmail = session.user.email ?? "";
  const bookings = customerEmail ? listBookingsByCustomerEmail(customerEmail) : [];

  const customerUser = customerEmail ? getCustomerUserByEmail(customerEmail) : null;
  const loyalty = customerUser ? getLoyaltyStatus(customerUser.id) : null;
  const referralCode = customerUser ? getOrCreateReferralCode(customerUser.id) : null;

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

      {/* Programme fidélité */}
      {loyalty && (
        <section className="card mx-auto max-w-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h2 className="text-xl font-bold">Mes points fidélité</h2>
          </div>

          {loyalty.discountPercent > 0 ? (
            <div className="rounded-xl bg-gradient-to-br from-[#fff0e8] to-[#fce8f3] p-4 space-y-1">
              <p className="font-bold text-[#c48fa3]">
                Félicitations ! Tu as une remise -{loyalty.discountPercent}% disponible.
              </p>
              <p className="text-sm text-[#5f4754]">
                Mentionne-le lors de ta prochaine réservation pour en bénéficier.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#fdf7f9] p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#5f4754]">Progression vers -{LOYALTY_REWARD_DISCOUNT}%</span>
                <span className="font-bold">
                  {loyalty.totalPoints}/{LOYALTY_REWARD_THRESHOLD} pts
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#e8d5de] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#c48fa3] transition-all"
                  style={{
                    width: `${Math.min(100, (loyalty.totalPoints % LOYALTY_REWARD_THRESHOLD) / LOYALTY_REWARD_THRESHOLD * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[#8a6578]">
                Encore {loyalty.nextRewardAt} séance{loyalty.nextRewardAt > 1 ? "s" : ""} pour
                obtenir ta remise de -{LOYALTY_REWARD_DISCOUNT}%
              </p>
            </div>
          )}

          <p className="text-xs text-[#8a6578]">
            Total : <strong>{loyalty.totalPoints} points</strong> •{" "}
            {loyalty.confirmedBookings} séance{loyalty.confirmedBookings > 1 ? "s" : ""} confirmée{loyalty.confirmedBookings > 1 ? "s" : ""}
          </p>
        </section>
      )}

      {/* Parrainage */}
      {referralCode && (
        <section className="card mx-auto max-w-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <h2 className="text-xl font-bold">Parraine une amie</h2>
          </div>
          <p className="text-sm text-[#5f4754]">
            Partage ton code à une amie. Quand elle confirme sa première réservation, tu gagnes{" "}
            <strong>+2 points fidélité</strong> !
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="rounded-xl bg-[#f5eef1] px-4 py-2 text-lg font-mono font-bold text-[#c48fa3] tracking-widest">
              {referralCode}
            </code>
            <p className="text-xs text-[#8a6578]">
              À saisir lors de l&apos;inscription sur le site.
            </p>
          </div>
        </section>
      )}

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
