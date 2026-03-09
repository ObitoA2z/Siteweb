export function readCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const tokenPair = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return tokenPair ? decodeURIComponent(tokenPair.split("=").slice(1).join("=")) : "";
}

export function getAdminCsrfToken(): string {
  return readCookie("lash_admin_csrf");
}

export function getAdminCsrfHeaders(): HeadersInit {
  const token = getAdminCsrfToken();
  return token ? { "x-csrf-token": token } : {};
}

