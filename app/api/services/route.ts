import { NextResponse } from "next/server";

import { listServices } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const services = listServices().map((service) => ({
    id: service.id,
    name: service.name,
    durationMin: service.durationMin,
    priceCents: service.priceCents,
  }));

  return NextResponse.json(services);
}
