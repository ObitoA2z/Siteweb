import { NextRequest, NextResponse } from "next/server";

import { getBusinessSettings, getDailyBookingLoad, listClosedDays, listOpenSlotsForServiceDate } from "@/lib/db";
import { getUtcBoundsForLocalDay, getWeekday } from "@/lib/time";
import { availabilityQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = {
    serviceId: request.nextUrl.searchParams.get("serviceId"),
    date: request.nextUrl.searchParams.get("date"),
  };

  const parsed = availabilityQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceId, date } = parsed.data;
  const settings = getBusinessSettings();
  if (!settings.workingDays.includes(getWeekday(date))) {
    return NextResponse.json([]);
  }
  if (listClosedDays({ startDate: date, endDate: date }).length > 0) {
    return NextResponse.json([]);
  }

  const load = getDailyBookingLoad(date);
  if (load.bookedCount >= load.capacity) {
    return NextResponse.json([]);
  }

  const { startUtc, endUtc } = getUtcBoundsForLocalDay(date);
  const slots = listOpenSlotsForServiceDate({ serviceId, startUtc, endUtc });

  return NextResponse.json(
    slots.map((slot) => ({
      slotId: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
    })),
  );
}
