import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBookingsManager } from "@/components/admin/AdminBookingsManager";
import { getAdminSession } from "@/lib/auth";
import { listBookings, listServices } from "@/lib/db";

export default async function AdminBookingsPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const services = listServices({ includeInactive: true });
  const bookings = listBookings();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Reservations</h1>
      </div>

      <AdminNav />
      <AdminBookingsManager initialBookings={bookings} services={services} />
    </div>
  );
}
