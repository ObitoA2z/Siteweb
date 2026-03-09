import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CustomerBookingsList } from "@/components/account/CustomerBookingsList";
import { CustomerSignOutButton } from "@/components/auth/CustomerSignOutButton";
import { customerAuthOptions } from "@/lib/customerAuth";
import { listBookingsByCustomerEmail } from "@/lib/db";

export default async function CustomerAccountPage() {
  const session = await getServerSession(customerAuthOptions);
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account");
  }

  const customerEmail = session.user.email ?? "";
  const bookings = customerEmail ? listBookingsByCustomerEmail(customerEmail) : [];

  return (
    <div className="shell space-y-6">
      <section className="card mx-auto max-w-3xl space-y-5 p-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Mon compte</p>
          <h1 className="text-3xl font-bold">Bienvenue {session.user.name || "cliente"}</h1>
          <p className="text-[#5f4754]">{session.user.email}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/booking" className="btn-main">
            Reserver un creneau
          </Link>
          <CustomerSignOutButton />
        </div>
      </section>

      <section className="card mx-auto max-w-3xl space-y-4 p-6">
        <h2 className="text-2xl font-bold">Mes creneaux reserves</h2>
        <CustomerBookingsList initialBookings={bookings} />
      </section>
    </div>
  );
}
