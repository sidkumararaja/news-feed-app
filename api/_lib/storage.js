// Server-side persistence for topics, dismissals and scoring penalties.
// Everything lives in one small JSON document behind a two-backend adapter:
//
//  1. Upstash Redis via its REST API (plain fetch, no SDK) when
//     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.
//     This is the durable option for Vercel, where the filesystem is
//     ephemeral. Vercel's Upstash marketplace integration injects these
//     variables automatically.
//  2. A flat JSON file otherwise: .data/store.json locally, /tmp on Vercel
//     (works, but resets whenever the function instance is recycled —
//     the README calls this out).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const REDIS_KEY = 'news-feed-store';

// Topics with a `category` are fetched from GNews's top-headlines endpoint
// (native category feed); the rest use keyword search. Keywords are used for
// relevance scoring either way.
const DEFAULT_TOPICS = [
  {
    id: 'world-news',
    label: 'World News',
    category: 'world',
    keywords: ['election', 'united nations', 'diplomacy', 'conflict', 'summit'],
  },
  {
    id: 'ai',
    label: 'AI',
    keywords: ['artificial intelligence', 'AI', 'LLM', 'OpenAI', 'Anthropic', 'machine learning'],
  },
  {
    id: 'movies',
    label: 'Movies',
    keywords: ['movie', 'film', 'box office', 'trailer', 'Hollywood', 'cinema'],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    keywords: ['video game', 'gaming', 'PlayStation', 'Xbox', 'Nintendo', 'Steam'],
  },
  {
    id: 'sport',
    label: 'Sport',
    category: 'sports',
    keywords: ['championship', 'NBA', 'NFL', 'soccer', 'tennis', 'Olympics'],
  },
];

// Bump when DEFAULT_TOPICS changes shape; loadStore migrates stored data.
const SEED_VERSION = 2;
const LEGACY_TOPIC_IDS = ['ai-industry', 'tabletop-gaming', 'enterprise-software'];

export function defaultStore() {
  return {
    seedVersion: SEED_VERSION,
    topics: DEFAULT_TOPICS,
    // articleId -> { dismissedAt, title, source }
    dismissed: {},
    // learned down-weights from "not interested" clicks
    penalties: { terms: {}, sources: {} },
  };
}

// Replace retired seed topics with the current set, preserving anything the
// user created themselves.
async function migrate(store) {
  if ((store.seedVersion ?? 1) >= SEED_VERSION) return store;
  store.topics = store.topics.filter((t) => !LEGACY_TOPIC_IDS.includes(t.id));
  for (const topic of DEFAULT_TOPICS) {
    if (!store.topics.some((t) => t.id === topic.id)) store.topics.push(topic);
  }
  store.seedVersion = SEED_VERSION;
  await saveStore(store);
  return store;
}

// Vercel's Upstash Marketplace integration injects KV_REST_API_* names
// (legacy Vercel KV convention); Upstash's own docs use UPSTASH_REDIS_REST_*.
// Accept either.
export function redisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

// 'redis' is durable; 'file' is fine locally but ephemeral on Vercel.
export function storageBackend() {
  if (redisConfig()) return 'redis';
  return process.env.VERCEL ? 'ephemeral' : 'file';
}

function filePath() {
  return process.env.VERCEL
    ? path.join('/tmp', 'news-feed-store.json')
    : path.join(process.cwd(), '.data', 'store.json');
}

export async function loadStore() {
  const redis = redisConfig();
  let raw = null;
  if (redis) {
    const resp = await fetch(`${redis.url}/get/${REDIS_KEY}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
    });
    const data = await resp.json().catch(() => ({}));
    raw = data.result ?? null;
  } else {
    raw = await readFile(filePath(), 'utf8').catch(() => null);
  }
  if (!raw) return defaultStore();
  try {
    const parsed = JSON.parse(raw);
    // Stores written before versioning existed count as version 1.
    return await migrate({
      ...defaultStore(),
      ...parsed,
      seedVersion: parsed.seedVersion ?? 1,
    });
  } catch {
    return defaultStore();
  }
}

export async function saveStore(store) {
  const raw = JSON.stringify(store);
  const redis = redisConfig();
  if (redis) {
    await fetch(`${redis.url}/set/${REDIS_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redis.token}` },
      body: raw,
    });
  } else {
    const file = filePath();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, raw);
  }
}
