type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, event: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event: string, meta?: Record<string, unknown>) {
  write("info", event, meta);
}

export function logWarn(event: string, meta?: Record<string, unknown>) {
  write("warn", event, meta);
}

export function logError(event: string, meta?: Record<string, unknown>) {
  write("error", event, meta);
}
