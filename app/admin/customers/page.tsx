import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminCustomersManager } from "@/components/admin/AdminCustomersManager";
import { getAdminSession } from "@/lib/auth";
import { listCustomerAccountsPaged } from "@/lib/db";

export default async function AdminCustomersPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const accounts = listCustomerAccountsPaged({}, { page: 1, pageSize: 30 });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Comptes clients</h1>
        <p className="mt-2 text-sm text-[#5f4754]">{accounts.total} compte(s) cree(s)</p>
      </div>

      <AdminNav />
      <AdminCustomersManager initialAccounts={accounts.items} />
    </div>
  );
}
