const fallbackSecret = "replace-this-with-a-long-random-session-secret-32chars-min";

function getValue(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    return defaultValue;
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

const sessionSecret = getValue("SESSION_SECRET", fallbackSecret);
const nextAuthSecret = getOptionalValue("NEXTAUTH_SECRET");

if (sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

if (nextAuthSecret && nextAuthSecret.length < 32) {
  throw new Error("NEXTAUTH_SECRET must contain at least 32 characters.");
}


export const env = {
  DB_PATH: getValue("DB_PATH", "./data/app.sqlite"),
  ADMIN_USERNAME: getValue("ADMIN_USERNAME", "admin"),
  ADMIN_PASSWORD: getValue("ADMIN_PASSWORD", "admin"),
  ADMIN_COOKIE_SECURE: getValue("ADMIN_COOKIE_SECURE", "false") === "true",
  SESSION_SECRET: sessionSecret,
  APP_TIMEZONE: getValue("APP_TIMEZONE", "Europe/Paris"),
  APP_BASE_URL: getValue("NEXTAUTH_URL", "http://localhost:3000"),
  MAIL_FROM: getOptionalValue("MAIL_FROM"),
  ADMIN_NOTIFICATION_EMAIL: getOptionalValue("ADMIN_NOTIFICATION_EMAIL"),
  SMTP_HOST: getOptionalValue("SMTP_HOST"),
  SMTP_PORT: Number(getValue("SMTP_PORT", "587")),
  SMTP_SECURE: getValue("SMTP_SECURE", "false") === "true",
  SMTP_USER: getOptionalValue("SMTP_USER"),
  SMTP_PASS: getOptionalValue("SMTP_PASS"),
};
