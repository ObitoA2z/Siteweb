import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPlanningManager } from "@/components/admin/AdminPlanningManager";
import { getAdminSession } from "@/lib/auth";
import { getBusinessSettings, listClosedDays, listServices } from "@/lib/db";
import { addDays, todayInParis } from "@/lib/time";

export default async function AdminPlanningPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const services = listServices({ includeInactive: true });
  const settings = getBusinessSettings();
  const startDate = todayInParis();
  const endDate = addDays(startDate, 120);
  const closedDays = listClosedDays({ startDate, endDate });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Planning intelligent</h1>
      </div>

      <AdminNav />
      <AdminPlanningManager initialSettings={settings} initialClosedDays={closedDays} services={services} />
    </div>
  );
}

