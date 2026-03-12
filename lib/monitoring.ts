import { env } from "@/lib/env";
import { logError } from "@/lib/logger";

export async function reportServerError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    context,
    message,
    stack,
    meta: meta ?? {},
  };

  logError("server_error", payload);

  if (!env.ERROR_MONITOR_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(env.ERROR_MONITOR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        ...payload,
      }),
    });
  } catch {
    // Keep requests non-blocking and never fail business flows because monitoring is down.
  }
}
