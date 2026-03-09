const DEFAULT_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || process.env.APP_TIMEZONE || "Europe/Paris";

function parseOffsetToMinutes(offsetText: string): number {
  const normalized = offsetText.replace("UTC", "GMT");
  const match = normalized.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function getOffsetMinutesAt(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const part = formatter.formatToParts(date).find((item) => item.type === "timeZoneName");
  return parseOffsetToMinutes(part?.value ?? "GMT+0");
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
  }
  return { year: y, month: m, day: d };
}

function formatUtcDateParts(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeParts(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid time format: "${time}". Expected HH:mm.`);
  }
  return { hour: h, minute: m };
}

export function zonedLocalToUtcIso(
  date: string,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getOffsetMinutesAt(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

function addUtcDay(date: string): string {
  const { year, month, day } = parseDateParts(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  return formatUtcDateParts(utcDate);
}

export function getUtcBoundsForLocalDay(
  date: string,
  timeZone: string = DEFAULT_TIMEZONE,
): { startUtc: string; endUtc: string } {
  const startUtc = zonedLocalToUtcIso(date, "00:00", timeZone);
  const endUtc = zonedLocalToUtcIso(addUtcDay(date), "00:00", timeZone);

  return { startUtc, endUtc };
}

export function formatDateTime(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function toEuro(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function todayInParis(timeZone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function minutesToTimeString(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error("Invalid time value.");
  }
  return hour * 60 + minute;
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateParts(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return formatUtcDateParts(utcDate);
}

export function getWeekday(date: string): number {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isoToLocalDate(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
