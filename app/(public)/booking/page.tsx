import { getServerSession } from "next-auth";

import { BookingForm } from "@/components/BookingForm";
import { customerAuthOptions } from "@/lib/customerAuth";
import { listOpenSlotsForServiceDate, listServices } from "@/lib/db";
import { getUtcBoundsForLocalDay, todayInParis } from "@/lib/time";

export default async function BookingPage() {
  const services = listServices();
  if (services.length === 0) {
    return (
      <div className="shell">
        <div className="card space-y-3 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Reservation</p>
          <h1 className="text-3xl font-bold">Aucune prestation disponible</h1>
          <p className="text-[#5f4754]">
            Les prestations ne sont pas encore configurees. Merci de revenir plus tard ou de nous contacter.
          </p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(customerAuthOptions);
  const initialDate = todayInParis();
  const firstServiceId = services[0]?.id;
  const bounds = getUtcBoundsForLocalDay(initialDate);
  const initialSlots = firstServiceId
    ? listOpenSlotsForServiceDate({
        serviceId: firstServiceId,
        startUtc: bounds.startUtc,
        endUtc: bounds.endUtc,
      }).map((slot) => ({
        slotId: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
      }))
    : [];

  return (
    <div className="shell space-y-7">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Reservation</p>
        <h1 className="text-4xl font-bold">Choisir un creneau</h1>
        <p className="max-w-2xl text-[#5f4754]">
          Etape 1: prestation. Etape 2: date/heure. Etape 3: demande en attente de validation admin.
        </p>
      </div>

      <BookingForm
        services={services}
        initialDate={initialDate}
        initialSlots={initialSlots}
        initialCustomerName={session?.user?.name ?? ""}
        initialCustomerEmail={session?.user?.email ?? ""}
      />
    </div>
  );
}
