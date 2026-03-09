import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSlotsManager } from "@/components/admin/AdminSlotsManager";
import { getAdminSession } from "@/lib/auth";
import { listServices, listSlots } from "@/lib/db";
import { getUtcBoundsForLocalDay, todayInParis } from "@/lib/time";

export default async function AdminSlotsPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const services = listServices({ includeInactive: true });
  const day = todayInParis();
  const bounds = getUtcBoundsForLocalDay(day);
  const slots = listSlots({ startUtc: bounds.startUtc, endUtc: bounds.endUtc });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Gestion des creneaux</h1>
      </div>

      <AdminNav />
      <AdminSlotsManager initialSlots={slots} services={services} />
    </div>
  );
}
