import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;
const phoneRegex = /^\+?\d{6,15}$/;

function normalizePhoneInput(value: string): string {
  const trimmed = value.trim();
  const hasPlusPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return `${hasPlusPrefix ? "+" : ""}${digits}`;
}

const isoDateString = z.string().regex(isoDateRegex, "Format attendu: YYYY-MM-DD");
const timeString = z.string().regex(timeRegex, "Format attendu: HH:mm");
const isoDateTimeString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Date/heure invalide.",
});
const bookingStatus = z.enum(["pending", "confirmed", "cancel_requested", "cancelled", "no_show"]);
const weekdayValues = z.array(z.number().int().min(0).max(6)).min(1).max(7);
const normalizedEmail = z.string().trim().toLowerCase().email().max(160);
const normalizedPhone = z
  .string()
  .trim()
  .max(40)
  .transform(normalizePhoneInput)
  .refine((value) => phoneRegex.test(value), "Telephone invalide.");
const strongPassword = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caracteres.")
  .max(128)
  .refine((value) => /[a-z]/.test(value), "Le mot de passe doit contenir une minuscule.")
  .refine((value) => /[A-Z]/.test(value), "Le mot de passe doit contenir une majuscule.")
  .refine((value) => /\d/.test(value), "Le mot de passe doit contenir un chiffre.")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Le mot de passe doit contenir un caractere special.");

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
  otp: z.string().trim().regex(/^\d{6}$/).optional(),
}).strict();

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  durationMin: z.number().int().min(15).max(240),
  priceCents: z.number().int().min(100).max(100000),
  isActive: z.boolean().optional(),
}).strict();

export const serviceUpdateSchema = serviceCreateSchema.extend({
  id: z.number().int().positive(),
}).strict();

export const serviceDeleteSchema = z.object({
  id: z.number().int().positive(),
}).strict();

export const bookingCreateSchema = z.object({
  slotId: z.number().int().positive(),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: normalizedPhone,
  customerEmail: normalizedEmail.max(120),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().optional().default(""),
  formStartedAt: z.number().int().positive().optional(),
}).strict();

export const availabilityQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  date: isoDateString,
}).strict();

export const slotCreateSchema = z.object({
  serviceId: z.number().int().positive(),
  startAt: isoDateTimeString,
  endAt: isoDateTimeString,
  status: z.enum(["open", "blocked"]).optional(),
}).strict();

export const slotGenerateSchema = z.object({
  mode: z.literal("generate_day"),
  serviceId: z.number().int().positive(),
  date: isoDateString,
  startTime: timeString,
  endTime: timeString,
  stepMin: z.number().int().min(15).max(240),
}).strict();

export const slotGenerateWeekSchema = z.object({
  mode: z.literal("generate_week"),
  serviceId: z.number().int().positive(),
  startDate: isoDateString,
  days: z.number().int().min(1).max(28),
  stepMin: z.number().int().min(15).max(240),
}).strict();

export const slotUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["open", "blocked"]),
}).strict();

export const slotDeleteSchema = z.object({
  id: z.number().int().positive(),
  force: z.boolean().optional(),
}).strict();

export const slotDeleteDaySchema = z.object({
  action: z.literal("delete_day"),
  date: isoDateString,
  serviceId: z.number().int().positive().optional(),
  force: z.boolean().optional(),
}).strict();

export const slotListQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
  date: isoDateString.optional(),
}).strict();

export const bookingListQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
  date: isoDateString.optional(),
  status: bookingStatus.optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const adminCustomerListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  provider: z.enum(["email", "google", "email+google"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const auditListQuerySchema = z.object({
  eventType: z.string().trim().max(80).optional(),
  date: isoDateString.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const emailOutboxListQuerySchema = z.object({
  status: z.enum(["pending", "retry", "sending", "sent", "failed"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const emailOutboxActionSchema = z.object({
  action: z.literal("retry"),
  id: z.number().int().positive(),
}).strict();

export const planningSettingsUpdateSchema = z
  .object({
    openTime: timeString,
    closeTime: timeString,
    breakStart: timeString,
    breakEnd: timeString,
    workingDays: weekdayValues,
    dailyBookingLimit: z.number().int().min(1).max(100),
    maxOverbooking: z.number().int().min(0).max(10),
    maxCancellationsBeforeBlock: z.number().int().min(1).max(20),
  })
  .strict();

export const closedDayCreateSchema = z
  .object({
    date: isoDateString,
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .strict();

export const closedDayDeleteSchema = z
  .object({
    date: isoDateString,
  })
  .strict();

export const bookingAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    bookingId: z.number().int().positive(),
  }).strict(),
  z.object({
    action: z.literal("confirm"),
    bookingId: z.number().int().positive(),
  }).strict(),
  z.object({
    action: z.literal("reject_cancel_request"),
    bookingId: z.number().int().positive(),
  }).strict(),
  z.object({
    action: z.literal("mark_no_show"),
    bookingId: z.number().int().positive(),
  }).strict(),
]);

export const bookingCustomerCancelRequestSchema = z.object({
  bookingId: z.number().int().positive(),
}).strict();

export const waitlistCreateSchema = z
  .object({
    serviceId: z.number().int().positive(),
    preferredDate: isoDateString,
    preferredTime: timeString.optional(),
    customerName: z.string().trim().min(2).max(80),
    customerPhone: normalizedPhone,
    customerEmail: normalizedEmail.max(120),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .strict();

export const waitlistUpdateSchema = z
  .object({
    id: z.number().int().positive(),
    status: z.enum(["pending", "contacted", "converted", "cancelled"]),
  })
  .strict();

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: normalizedEmail,
  phone: z.union([normalizedPhone, z.literal("")]).optional(),
  password: strongPassword,
  website: z.string().optional().default(""),
  formStartedAt: z.number().int().positive().optional(),
}).strict();

export const customerLoginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1).max(128),
}).strict();

export const customerForgotPasswordSchema = z.object({
  email: normalizedEmail,
}).strict();

export const customerResetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: strongPassword,
}).strict();

export const customerEmailVerifyTokenSchema = z.object({
  token: z.string().trim().min(32).max(256),
}).strict();

export const customerMetaUpdateSchema = z
  .object({
    id: z.number().int().positive(),
    isVip: z.boolean(),
    isBlacklisted: z.boolean(),
    internalNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();
