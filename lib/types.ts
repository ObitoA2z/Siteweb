export type SlotStatus = "open" | "booked" | "blocked";
export type BookingStatus = "pending" | "confirmed" | "cancel_requested" | "cancelled" | "no_show";
export type WaitlistStatus = "pending" | "contacted" | "converted" | "cancelled";
export type EmailOutboxStatus = "pending" | "retry" | "sending" | "sent" | "failed";

export interface Service {
  id: number;
  name: string;
  durationMin: number;
  priceCents: number;
  isActive: boolean;
}

export interface Slot {
  id: number;
  serviceId: number;
  serviceName?: string;
  startAt: string;
  endAt: string;
  status: SlotStatus;
  createdAt: string;
}

export interface Booking {
  id: number;
  slotId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  status: BookingStatus;
  createdAt: string;
  startAt: string;
  endAt: string;
  serviceId: number;
  serviceName: string;
}

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  googleId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface CustomerAccountSummary {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  authProvider: "email" | "google" | "email+google";
  createdAt: string;
  bookingCount: number;
  lastBookingAt: string | null;
  lastBookingStatus: BookingStatus | null;
  internalNotes: string | null;
  isVip: boolean;
  isBlacklisted: boolean;
  cancelledCount: number;
}

export interface AuditLogItem {
  id: number;
  eventType: string;
  actorType: "admin" | "system" | "customer";
  actorId: string | null;
  message: string;
  metaJson: string | null;
  createdAt: string;
}

export interface BusinessSettings {
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  workingDays: number[];
  dailyBookingLimit: number;
  maxOverbooking: number;
  maxCancellationsBeforeBlock: number;
  updatedAt: string;
}

export interface ClosedDay {
  date: string;
  reason: string | null;
  createdAt: string;
}

export interface WaitlistEntry {
  id: number;
  serviceId: number;
  serviceName?: string;
  preferredDate: string;
  preferredTime: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  status: WaitlistStatus;
  createdAt: string;
}

export interface EmailOutboxItem {
  id: number;
  category: string;
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  status: EmailOutboxStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  nextAttemptAt: string;
  lockedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailOutboxPage {
  items: EmailOutboxItem[];
  total: number;
  page: number;
  pageSize: number;
}
