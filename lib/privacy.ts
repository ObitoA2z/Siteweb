export function maskEmail(email: string | null | undefined): string {
  if (!email) {
    return "unknown";
  }

  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!domain) {
    return "***";
  }

  const safeLocal =
    local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;
  return `${safeLocal}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) {
    return "unknown";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "*".repeat(digits.length);
  }

  const suffix = digits.slice(-2);
  return `${"*".repeat(Math.max(2, digits.length - 2))}${suffix}`;
}

