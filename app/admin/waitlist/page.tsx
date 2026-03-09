import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminWaitlistManager } from "@/components/admin/AdminWaitlistManager";
import { getAdminSession } from "@/lib/auth";
import { listWaitlistEntries } from "@/lib/db";

export default async function AdminWaitlistPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const entries = listWaitlistEntries();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Liste d&apos;attente</h1>
      </div>

      <AdminNav />
      <AdminWaitlistManager initialEntries={entries} />
    </div>
  );
}

