import Redis from "ioredis";

import { env } from "@/lib/env";
import { logError } from "@/lib/logger";

type Bucket = {
  resetAt: number;
  count: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();
let lastMemoryCleanupAt = 0;

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  if (!env.RATE_LIMIT_REDIS_URL) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis(env.RATE_LIMIT_REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });

  redisClient.on("error", (error) => {
    logError("rate_limit_redis_error", { error: error instanceof Error ? error.message : String(error) });
  });

  return redisClient;
}

function cleanupMemoryBuckets(now: number) {
  // Cleanup at most once per minute, or immediately if map grows too large.
  if (now - lastMemoryCleanupAt < 60_000 && memoryBuckets.size < 10_000) {
    return;
  }

  lastMemoryCleanupAt = now;
  for (const [key, value] of memoryBuckets.entries()) {
    if (now > value.resetAt) {
      memoryBuckets.delete(key);
    }
  }
}

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupMemoryBuckets(now);

  const existing = memoryBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

async function checkRateLimitInRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const namespacedKey = `${env.RATE_LIMIT_REDIS_PREFIX}${key}`;
    const count = await client.incr(namespacedKey);
    let ttlMs = await client.pttl(namespacedKey);

    if (count === 1 || ttlMs < 0) {
      await client.pexpire(namespacedKey, windowMs);
      ttlMs = windowMs;
    }

    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + Math.max(0, ttlMs),
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redisResult = await checkRateLimitInRedis(key, limit, windowMs);
  if (redisResult) {
    return redisResult;
  }
  return checkRateLimitInMemory(key, limit, windowMs);
}
