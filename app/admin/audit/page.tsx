import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAuditManager } from "@/components/admin/AdminAuditManager";
import { getAdminSession } from "@/lib/auth";
import { listAuditLogs } from "@/lib/db";

export default async function AdminAuditPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const logs = listAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Journal d&apos;activite</h1>
        <p className="mt-2 text-sm text-[#5f4754]">{logs.length} evenement(s)</p>
      </div>

      <AdminNav />
      <AdminAuditManager initialLogs={logs} />
    </div>
  );
}
