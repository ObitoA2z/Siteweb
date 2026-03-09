import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminServicesManager } from "@/components/admin/AdminServicesManager";
import { getAdminSession } from "@/lib/auth";
import { listServices } from "@/lib/db";

export default async function AdminServicesPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const services = listServices({ includeInactive: true });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Gestion des prestations</h1>
      </div>

      <AdminNav />
      <AdminServicesManager initialServices={services} />
    </div>
  );
}
