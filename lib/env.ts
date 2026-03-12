const isProduction = process.env.NODE_ENV === "production";

function getValue(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    return defaultValue;
  }
  return value.trim();
}

function getRequiredValue(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`[env] Missing required variable: ${key}`);
  }
  return value.trim();
}

function getOptionalValue(key: string): string | null {
  const value = process.env[key];
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
}

function parseBoolean(value: string): boolean {
  return value.trim().toLowerCase() === "true";
}

function parseNumber(value: string, key: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[env] ${key} must be a number.`);
  }
  return parsed;
}

const sessionSecret = getRequiredValue("SESSION_SECRET");
if (sessionSecret.length < 32) {
  throw new Error("[env] SESSION_SECRET must contain at least 32 characters.");
}

const nextAuthSecret = getOptionalValue("NEXTAUTH_SECRET");
if (nextAuthSecret && nextAuthSecret.length < 32) {
  throw new Error("[env] NEXTAUTH_SECRET must contain at least 32 characters.");
}

const adminPassword = getRequiredValue("ADMIN_PASSWORD");
const weakPasswords = new Set(["admin", "password", "123456", "admin123", "admin1234"]);
if (isProduction && weakPasswords.has(adminPassword.toLowerCase())) {
  throw new Error("[env] ADMIN_PASSWORD is too weak for production.");
}

const passwordResetTokenTtlMinutes = parseNumber(
  getValue("PASSWORD_RESET_TOKEN_TTL_MINUTES", "30"),
  "PASSWORD_RESET_TOKEN_TTL_MINUTES",
);
if (passwordResetTokenTtlMinutes < 5 || passwordResetTokenTtlMinutes > 240) {
  throw new Error("[env] PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 240.");
}

const emailOutboxMaxAttempts = parseNumber(
  getValue("EMAIL_OUTBOX_MAX_ATTEMPTS", "5"),
  "EMAIL_OUTBOX_MAX_ATTEMPTS",
);
if (emailOutboxMaxAttempts < 1 || emailOutboxMaxAttempts > 20) {
  throw new Error("[env] EMAIL_OUTBOX_MAX_ATTEMPTS must be between 1 and 20.");
}

export const env = {
  DB_PATH: getValue("DB_PATH", "./data/app.sqlite"),
  ADMIN_USERNAME: getValue("ADMIN_USERNAME", "admin"),
  ADMIN_PASSWORD: adminPassword,
  ADMIN_COOKIE_SECURE: parseBoolean(getValue("ADMIN_COOKIE_SECURE", isProduction ? "true" : "false")),
  SESSION_SECRET: sessionSecret,
  APP_TIMEZONE: getValue("APP_TIMEZONE", "Europe/Paris"),
  APP_BASE_URL: getValue("NEXTAUTH_URL", "http://localhost:3000"),
  MAIL_FROM: getOptionalValue("MAIL_FROM"),
  ADMIN_NOTIFICATION_EMAIL: getOptionalValue("ADMIN_NOTIFICATION_EMAIL"),
  SMTP_HOST: getOptionalValue("SMTP_HOST"),
  SMTP_PORT: parseNumber(getValue("SMTP_PORT", "587"), "SMTP_PORT"),
  SMTP_SECURE: parseBoolean(getValue("SMTP_SECURE", "false")),
  SMTP_USER: getOptionalValue("SMTP_USER"),
  SMTP_PASS: getOptionalValue("SMTP_PASS"),
  ADMIN_TOTP_SECRET: getOptionalValue("ADMIN_TOTP_SECRET"),
  RATE_LIMIT_REDIS_URL: getOptionalValue("RATE_LIMIT_REDIS_URL"),
  RATE_LIMIT_REDIS_PREFIX: getValue("RATE_LIMIT_REDIS_PREFIX", "lash:ratelimit:"),
  TRUST_PROXY_HEADERS: parseBoolean(getValue("TRUST_PROXY_HEADERS", "false")),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: passwordResetTokenTtlMinutes,
  EMAIL_OUTBOX_MAX_ATTEMPTS: emailOutboxMaxAttempts,
  ERROR_MONITOR_WEBHOOK_URL: getOptionalValue("ERROR_MONITOR_WEBHOOK_URL"),
};
