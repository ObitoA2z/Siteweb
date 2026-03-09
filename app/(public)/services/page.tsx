import Link from "next/link";

import { ServiceCard } from "@/components/ServiceCard";
import { listServices } from "@/lib/db";

export default function ServicesPage() {
  const services = listServices();

  return (
    <div className="shell space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Rehaussement de cils</p>
        <h1 className="text-4xl font-bold">Tarifs 100% rehaussement de cils</h1>
        <p className="max-w-2xl text-[#5f4754]">
          Toutes les options proposees sur cette page sont dediees au rehaussement de cils uniquement.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      <div className="card flex flex-col items-start gap-3 p-6">
        <h2 className="text-2xl font-bold">Pret(e) a reserver ?</h2>
        <p className="text-[#5f4754]">Choisis ton jour et ton heure en ligne.</p>
        <Link href="/booking" className="btn-main">
          Reserver maintenant
        </Link>
      </div>
    </div>
  );
}
