import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, requireAdminCsrf } from "@/lib/auth";
import {
  addAuditLog,
  createSlot,
  deleteSlot,
  deleteSlotsByDay,
  getBusinessSettings,
  getServiceById,
  listClosedDays,
  listSlots,
  updateSlotStatus,
} from "@/lib/db";
import { requireBodySize, requireJsonRequest, requireTrustedOrigin } from "@/lib/security";
import { addDays, getUtcBoundsForLocalDay, getWeekday, minutesToTimeString, parseTimeToMinutes, zonedLocalToUtcIso } from "@/lib/time";
import {
  slotCreateSchema,
  slotDeleteDaySchema,
  slotDeleteSchema,
  slotGenerateSchema,
  slotGenerateWeekSchema,
  slotListQuerySchema,
  slotUpdateSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message) : "";
  return message.includes("UNIQUE");
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const parsed = slotListQuerySchema.safeParse({
    serviceId: request.nextUrl.searchParams.get("serviceId") ?? undefined,
    date: request.nextUrl.searchParams.get("date") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceId, date } = parsed.data;
  const bounds = date ? getUtcBoundsForLocalDay(date) : null;

  const slots = listSlots({
    serviceId,
    startUtc: bounds?.startUtc,
    endUtc: bounds?.endUtc,
  });

  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }
  const bodySizeGuard = requireBodySize(request, 32 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }
  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);

  const generateAttempt = slotGenerateSchema.safeParse(payload);
  if (generateAttempt.success) {
    const service = getServiceById(generateAttempt.data.serviceId);
    if (!service) {
      return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
    }

    const dayStartMin = parseTimeToMinutes(generateAttempt.data.startTime);
    const dayEndMin = parseTimeToMinutes(generateAttempt.data.endTime);
    if (dayEndMin <= dayStartMin) {
      return NextResponse.json({ error: "L'heure de fin doit etre apres l'heure de debut." }, { status: 400 });
    }

    const duration = service.durationMin;
    const step = generateAttempt.data.stepMin;
    let created = 0;
    let skipped = 0;

    for (let cursor = dayStartMin; cursor + duration <= dayEndMin; cursor += step) {
      const startTime = minutesToTimeString(cursor);
      const endTime = minutesToTimeString(cursor + duration);
      const startAt = zonedLocalToUtcIso(generateAttempt.data.date, startTime);
      const endAt = zonedLocalToUtcIso(generateAttempt.data.date, endTime);

      try {
        createSlot({
          serviceId: service.id,
          startAt,
          endAt,
          status: "open",
        });
        created += 1;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    addAuditLog({
      eventType: "slot.generate_day",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Generation journee ${generateAttempt.data.date}: ${created} crees`,
      meta: {
        date: generateAttempt.data.date,
        serviceId: generateAttempt.data.serviceId,
        created,
        skipped,
      },
    });
    return NextResponse.json({ created, skipped }, { status: 201 });
  }

  const generateWeekAttempt = slotGenerateWeekSchema.safeParse(payload);
  if (generateWeekAttempt.success) {
    const service = getServiceById(generateWeekAttempt.data.serviceId);
    if (!service) {
      return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
    }

    const settings = getBusinessSettings();
    const dayStartMin = parseTimeToMinutes(settings.openTime);
    const dayEndMin = parseTimeToMinutes(settings.closeTime);
    const breakStartMin = parseTimeToMinutes(settings.breakStart);
    const breakEndMin = parseTimeToMinutes(settings.breakEnd);
    if (dayEndMin <= dayStartMin) {
      return NextResponse.json({ error: "Configuration horaire invalide (ouverture/fermeture)." }, { status: 400 });
    }

    const duration = service.durationMin;
    const step = generateWeekAttempt.data.stepMin;
    const startDate = generateWeekAttempt.data.startDate;
    const endDate = addDays(startDate, generateWeekAttempt.data.days - 1);
    const closedDates = new Set(listClosedDays({ startDate, endDate }).map((item) => item.date));

    let created = 0;
    let skipped = 0;
    let skippedClosed = 0;
    let skippedNonWorking = 0;

    for (let i = 0; i < generateWeekAttempt.data.days; i += 1) {
      const currentDate = addDays(startDate, i);
      const weekday = getWeekday(currentDate);

      if (!settings.workingDays.includes(weekday)) {
        skippedNonWorking += 1;
        continue;
      }
      if (closedDates.has(currentDate)) {
        skippedClosed += 1;
        continue;
      }

      for (let cursor = dayStartMin; cursor + duration <= dayEndMin; cursor += step) {
        const endCursor = cursor + duration;
        const overlapsBreak = cursor < breakEndMin && endCursor > breakStartMin;
        if (overlapsBreak) {
          continue;
        }

        const startTime = minutesToTimeString(cursor);
        const endTime = minutesToTimeString(endCursor);
        const startAt = zonedLocalToUtcIso(currentDate, startTime);
        const endAt = zonedLocalToUtcIso(currentDate, endTime);

        try {
          createSlot({
            serviceId: service.id,
            startAt,
            endAt,
            status: "open",
          });
          created += 1;
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            skipped += 1;
            continue;
          }
          throw error;
        }
      }
    }

    addAuditLog({
      eventType: "slot.generate_week",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Generation ${generateWeekAttempt.data.days} jours: ${created} crees`,
      meta: {
        startDate,
        days: generateWeekAttempt.data.days,
        serviceId: generateWeekAttempt.data.serviceId,
        created,
        skipped,
        skippedClosed,
        skippedNonWorking,
      },
    });

    return NextResponse.json(
      {
        created,
        skipped,
        skippedClosed,
        skippedNonWorking,
      },
      { status: 201 },
    );
  }

  const createAttempt = slotCreateSchema.safeParse(payload);
  if (!createAttempt.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: createAttempt.error.flatten() }, { status: 400 });
  }

  try {
    const slot = createSlot(createAttempt.data);
    addAuditLog({
      eventType: "slot.create",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Creneau cree #${slot.id}`,
      meta: { slotId: slot.id, serviceId: slot.serviceId, startAt: slot.startAt },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Ce creneau existe deja." }, { status: 409 });
    }
    console.error("[admin/slots] create failed", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }
  const bodySizeGuard = requireBodySize(request, 16 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }
  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = slotUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ok = updateSlotStatus(parsed.data.id, parsed.data.status);
  if (!ok) {
    return NextResponse.json({ error: "Creneau introuvable." }, { status: 404 });
  }

  addAuditLog({
    eventType: "slot.update_status",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Statut creneau #${parsed.data.id} -> ${parsed.data.status}`,
    meta: { slotId: parsed.data.id, status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const originGuard = requireTrustedOrigin(request);
  if (originGuard) {
    return originGuard;
  }
  const bodySizeGuard = requireBodySize(request, 16 * 1024);
  if (bodySizeGuard) {
    return bodySizeGuard;
  }
  const jsonGuard = requireJsonRequest(request);
  if (jsonGuard) {
    return jsonGuard;
  }

  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }
  const csrf = requireAdminCsrf(request, guard.session);
  if (!csrf.ok) {
    return csrf.response;
  }

  const payload = await request.json().catch(() => null);
  const dayDeleteParsed = slotDeleteDaySchema.safeParse(payload);

  if (dayDeleteParsed.success) {
    const bounds = getUtcBoundsForLocalDay(dayDeleteParsed.data.date);
    const result = deleteSlotsByDay({
      startUtc: bounds.startUtc,
      endUtc: bounds.endUtc,
      serviceId: dayDeleteParsed.data.serviceId,
      force: dayDeleteParsed.data.force,
    });

    addAuditLog({
      eventType: "slot.delete_day",
      actorType: "admin",
      actorId: guard.session?.username ?? null,
      message: `Suppression journee ${dayDeleteParsed.data.date}: ${result.deleted} supprimes`,
      meta: {
        date: dayDeleteParsed.data.date,
        serviceId: dayDeleteParsed.data.serviceId ?? null,
        force: dayDeleteParsed.data.force === true,
        deleted: result.deleted,
        keptWithBookings: result.keptWithBookings,
        removedBookings: result.removedBookings,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.deleted,
      keptWithBookings: result.keptWithBookings,
      removedBookings: result.removedBookings,
    });
  }

  const slotDeleteParsed = slotDeleteSchema.safeParse(payload);
  if (!slotDeleteParsed.success) {
    return NextResponse.json({ error: "Validation invalide.", issues: slotDeleteParsed.error.flatten() }, { status: 400 });
  }

  const result = deleteSlot(slotDeleteParsed.data.id, { force: slotDeleteParsed.data.force });
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Creneau introuvable." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Suppression impossible (creneau reserve). Active `force` pour annuler et supprimer." },
      { status: 400 },
    );
  }

  addAuditLog({
    eventType: "slot.delete",
    actorType: "admin",
    actorId: guard.session?.username ?? null,
    message: `Creneau supprime #${slotDeleteParsed.data.id}`,
    meta: {
      slotId: slotDeleteParsed.data.id,
      force: slotDeleteParsed.data.force === true,
      hadBooking: result.hadBooking,
      removedBookingId: result.removedBookingId ?? null,
      removedBookingStatus: result.removedBookingStatus ?? null,
    },
  });
  return NextResponse.json({
    ok: true,
    deleted: 1,
    hadBooking: result.hadBooking,
    removedBookingId: result.removedBookingId ?? null,
    removedBookingStatus: result.removedBookingStatus ?? null,
  });
}
