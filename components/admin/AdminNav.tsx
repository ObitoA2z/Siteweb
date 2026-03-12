import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/slots", label: "Creneaux" },
  { href: "/admin/planning", label: "Planning" },
  { href: "/admin/bookings", label: "Reservations" },
  { href: "/admin/waitlist", label: "Attente" },
  { href: "/admin/customers", label: "Comptes" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/audit", label: "Journal" },
];

export function AdminNav() {
  return (
    <div className="mb-6 rounded-2xl border border-[#2d1e2718] bg-white/85 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="btn-soft text-sm">
              {link.label}
            </Link>
          ))}
        </div>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
