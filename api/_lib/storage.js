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

const DEFAULT_TOPICS = [
  {
    id: 'ai-industry',
    label: 'AI industry',
    keywords: ['artificial intelligence', 'AI', 'LLM', 'OpenAI', 'Anthropic', 'machine learning'],
  },
  {
    id: 'tabletop-gaming',
    label: 'Tabletop gaming',
    keywords: ['tabletop', 'board game', 'dungeons and dragons', 'D&D', 'miniature', 'RPG'],
  },
  {
    id: 'enterprise-software',
    label: 'Enterprise software',
    keywords: ['enterprise software', 'SaaS', 'Salesforce', 'SAP', 'cloud computing', 'Kubernetes'],
  },
];

export function defaultStore() {
  return {
    topics: DEFAULT_TOPICS,
    // articleId -> { dismissedAt, title, source }
    dismissed: {},
    // learned down-weights from "not interested" clicks
    penalties: { terms: {}, sources: {} },
  };
}

export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
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
    return { ...defaultStore(), ...JSON.parse(raw) };
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
