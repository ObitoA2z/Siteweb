"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getAdminCsrfHeaders } from "@/lib/clientSecurity";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: getAdminCsrfHeaders(),
    });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="btn-soft text-sm" disabled={loading}>
      {loading ? "Deconnexion..." : "Se deconnecter"}
    </button>
  );
}
