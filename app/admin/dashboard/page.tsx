import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminSession } from "@/lib/auth";
import { getBusinessKpis, getDashboardStats, listBookings } from "@/lib/db";
import { formatDateTime, toEuro } from "@/lib/time";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const stats = getDashboardStats();
  const business = getBusinessKpis();
  const allBookings = listBookings();
  const now = new Date();

  const pendingBookings = allBookings.filter((booking) => booking.status === "pending");
  const cancelRequested = allBookings.filter((booking) => booking.status === "cancel_requested");
  const upcoming = allBookings
    .filter((booking) => {
      if (booking.status === "cancelled") {
        return false;
      }
      return new Date(booking.startAt).getTime() >= now.getTime();
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Dashboard avance</h1>
      </div>

      <AdminNav />

      <section className="grid gap-4 md:grid-cols-7">
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Services actifs</p>
          <p className="text-3xl font-bold">{stats.serviceCount}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Creneaux ouverts</p>
          <p className="text-3xl font-bold">{stats.openSlots}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Reservations en attente</p>
          <p className="text-3xl font-bold">{stats.pendingBookings}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Demandes d&apos;annulation</p>
          <p className="text-3xl font-bold">{stats.cancelRequestedBookings}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Reservations confirmees</p>
          <p className="text-3xl font-bold">{stats.confirmedBookings}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">No-show total</p>
          <p className="text-3xl font-bold">{stats.noShowBookings}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Total reservations</p>
          <p className="text-3xl font-bold">{stats.totalBookings}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">CA du mois</p>
          <p className="text-3xl font-bold">{toEuro(business.monthRevenueCents)}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Taux d&apos;occupation</p>
          <p className="text-3xl font-bold">{Math.round(business.occupancyRate * 100)}%</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Taux de no-show</p>
          <p className="text-3xl font-bold">{Math.round(business.noShowRate * 100)}%</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Clientes recurrentes</p>
          <p className="text-3xl font-bold">{business.recurringCustomers}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm text-[#5f4754]">Liste d&apos;attente</p>
          <p className="text-3xl font-bold">{business.waitlistPending}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card space-y-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Actions prioritaires</h2>
            <Link href="/admin/bookings" className="text-sm font-semibold underline">
              Ouvrir reservations
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{pendingBookings.length}</strong> reservations en attente de confirmation.
            </p>
            <p>
              <strong>{cancelRequested.length}</strong> demandes d&apos;annulation en attente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/admin/bookings" className="btn-main text-sm">
              Traiter les demandes
            </Link>
            <Link href="/admin/slots" className="btn-soft text-sm">
              Gerer les creneaux
            </Link>
          </div>
        </article>

        <article className="card space-y-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Prochains rendez-vous</h2>
            <Link href="/admin/bookings" className="text-sm font-semibold underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[#5f4754]">Aucun rendez-vous a venir.</p>
            ) : (
              upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col justify-between rounded-xl border border-[#2d1e2714] p-3 text-sm md:flex-row md:items-center"
                >
                  <p>
                    <strong>{booking.customerName}</strong> - {booking.serviceName}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase text-[#6b4a59]">{booking.status}</span>
                    <p className="text-[#5f4754]">{formatDateTime(booking.startAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
