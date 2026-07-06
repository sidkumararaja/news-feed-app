// In-memory TTL cache. On Vercel each warm function instance keeps its own
// copy, which is enough to absorb repeated page loads and stay well inside
// the GNews free tier (100 requests/day). Cold starts refetch at most once
// per query per TTL window.

const store = new Map();

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}
