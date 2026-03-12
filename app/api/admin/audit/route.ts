import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/auth";
import { listAuditLogsPaged } from "@/lib/db";
import { getUtcBoundsForLocalDay } from "@/lib/time";
import { auditListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireAdminApiSession();
  if (guard.response) {
    return guard.response;
  }

  const parsed = auditListQuerySchema.safeParse({
    eventType: request.nextUrl.searchParams.get("eventType") ?? undefined,
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const bounds = parsed.data.date ? getUtcBoundsForLocalDay(parsed.data.date) : null;
  const logs = listAuditLogsPaged({
    eventType: parsed.data.eventType,
    startUtc: bounds?.startUtc,
    endUtc: bounds?.endUtc,
  }, {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  return NextResponse.json(logs);
}
