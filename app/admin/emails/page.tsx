import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminEmailOutboxManager } from "@/components/admin/AdminEmailOutboxManager";
import { getAdminSession } from "@/lib/auth";
import { listOutboxEmails } from "@/lib/emailOutbox";

export default async function AdminEmailsPage() {
  const session = await getAdminSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const initialPage = listOutboxEmails({ page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Admin</p>
        <h1 className="text-4xl font-bold">Suivi emails</h1>
        <p className="mt-2 text-sm text-[#5f4754]">{initialPage.total} email(s) dans l&apos;outbox</p>
      </div>

      <AdminNav />
      <AdminEmailOutboxManager initialPage={initialPage} />
    </div>
  );
}
