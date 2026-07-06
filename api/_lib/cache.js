// TTL cache for GNews responses, two layers:
//
//  L1: in-memory Map — free, but dies with each serverless instance.
//  L2: Upstash Redis (REST, plain fetch) when configured — survives cold
//      starts, which matters twice on the GNews free tier: it avoids
//      re-spending the 100 req/day budget, and it stops cold starts from
//      firing bursts that trip GNews's short-window rate limiter.
//
// Entries carry their own freshness timestamp and are kept in Redis for
// 24h past expiry so callers can fall back to a stale copy when GNews
// rejects a refresh (see gnews.js).

import { redisConfig } from './storage.js';

const memory = new Map();
const REDIS_KEEP_SECONDS = 24 * 3600;
const PREFIX = 'gnews:';

const isFresh = (entry) => entry && Date.now() < entry.expires;

export async function getCached(key, { allowStale = false } = {}) {
  const local = memory.get(key);
  if (isFresh(local)) return local.value;

  const redis = redisConfig();
  if (redis) {
    try {
      const resp = await fetch(
        `${redis.url}/get/${encodeURIComponent(PREFIX + key)}`,
        { headers: { Authorization: `Bearer ${redis.token}` } }
      );
      const data = await resp.json().catch(() => ({}));
      if (data.result) {
        const entry = JSON.parse(data.result);
        memory.set(key, entry);
        if (isFresh(entry) || allowStale) return entry.value;
        return undefined;
      }
    } catch {
      // Redis being unreachable should never break the feed.
    }
  }

  if (allowStale && local) return local.value;
  return undefined;
}

export async function setCached(key, value, ttlMs) {
  const entry = { value, expires: Date.now() + ttlMs };
  memory.set(key, entry);

  const redis = redisConfig();
  if (redis) {
    try {
      await fetch(
        `${redis.url}/set/${encodeURIComponent(PREFIX + key)}?EX=${REDIS_KEEP_SECONDS}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${redis.token}` },
          body: JSON.stringify(entry),
        }
      );
    } catch {
      // Best effort; L1 still has it.
    }
  }
}
