import "./load-env";
import { createService, createSlot, getDb, listServices, runPendingMigrations } from "../lib/db";
import { minutesToTimeString, todayInParis, zonedLocalToUtcIso } from "../lib/time";

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function main() {
  runPendingMigrations();

  if (listServices({ includeInactive: true }).length === 0) {
    createService({
      name: "Rehaussement de cils classique",
      durationMin: 60,
      priceCents: 5500,
      isActive: true,
    });
    createService({
      name: "Rehaussement de cils + teinture",
      durationMin: 50,
      priceCents: 4500,
      isActive: true,
    });
    createService({
      name: "Rehaussement de cils premium (soin keratine)",
      durationMin: 75,
      priceCents: 6500,
      isActive: true,
    });
  }

  const services = listServices();
  const db = getDb();
  const slotCount = (db.prepare("SELECT COUNT(*) as count FROM slots").get() as { count: number }).count;
  if (slotCount > 0) {
    console.log("Seed ignore: des slots existent deja.");
    return;
  }

  const firstService = services[0];
  const startDate = todayInParis();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(startDate, offset);
    for (let minutes = 9 * 60; minutes + firstService.durationMin <= 18 * 60; minutes += firstService.durationMin) {
      const startTime = minutesToTimeString(minutes);
      const endTime = minutesToTimeString(minutes + firstService.durationMin);
      const startAt = zonedLocalToUtcIso(date, startTime);
      const endAt = zonedLocalToUtcIso(date, endTime);
      createSlot({
        serviceId: firstService.id,
        startAt,
        endAt,
        status: "open",
      });
    }
  }

  console.log("Seed termine: services + 7 jours de slots.");
}

try {
  main();
} catch (error) {
  console.error("Erreur seed:", error);
  process.exit(1);
}
