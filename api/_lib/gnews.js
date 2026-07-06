// GNews API client. The API key lives only in the GNEWS_API_KEY environment
// variable and never leaves the server. All responses are cached (see
// cache.js) so repeated page loads don't burn the free tier's 100 req/day.
//
// Without a key the client serves bundled mock articles, so the whole app
// works end-to-end in development and demos.

import { getCached, setCached } from './cache.js';
import { MOCK_ARTICLES } from './mock-data.js';

const BASE = 'https://gnews.io/api/v4';
const TTL_MS =
  (Number(process.env.GNEWS_CACHE_TTL_MINUTES) || 60) * 60_000;

export function isMockMode() {
  return !process.env.GNEWS_API_KEY;
}

// Stable short id derived from the article URL (djb2), used as the key for
// dismissals and de-duplication.
function articleId(url) {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h * 33) ^ url.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function normalize(raw) {
  return {
    id: articleId(raw.url),
    title: raw.title ?? '',
    description: raw.description ?? '',
    url: raw.url,
    image: raw.image ?? null,
    publishedAt: raw.publishedAt,
    source: {
      name: raw.source?.name ?? 'Unknown source',
      url: raw.source?.url ?? null,
    },
  };
}

function mockResponse(endpoint, params) {
  let articles = MOCK_ARTICLES;
  if (endpoint === 'search' && params.q) {
    const terms = params.q
      .toLowerCase()
      .replace(/["()]/g, ' ')
      .split(/\s+or\s+|\s+/)
      .filter((t) => t && t !== 'or' && t !== 'and');
    articles = MOCK_ARTICLES.filter((a) => {
      const text = `${a.title} ${a.description}`.toLowerCase();
      return terms.some((t) => text.includes(t));
    });
  }
  return { articles: articles.map(normalize) };
}

async function gnewsFetch(endpoint, params) {
  const qs = new URLSearchParams(params);
  qs.sort();
  const cacheKey = `${endpoint}?${qs}`;

  const hit = getCached(cacheKey);
  if (hit) return { ...hit, fromCache: true };

  let value;
  if (isMockMode()) {
    value = mockResponse(endpoint, params);
  } else {
    qs.set('apikey', process.env.GNEWS_API_KEY);
    const resp = await fetch(`${BASE}/${endpoint}?${qs}`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const detail = Array.isArray(data.errors)
        ? data.errors.join('; ')
        : `status ${resp.status}`;
      throw new Error(`GNews request failed: ${detail}`);
    }
    value = { articles: (data.articles ?? []).map(normalize) };
  }

  setCached(cacheKey, value, TTL_MS);
  return { ...value, fromCache: false };
}

export function fetchTopHeadlines({ lang = 'en', max = 10 } = {}) {
  return gnewsFetch('top-headlines', {
    category: 'general',
    lang,
    max: String(max),
  });
}

export function searchArticles(q, { lang = 'en', max = 10 } = {}) {
  return gnewsFetch('search', {
    q,
    lang,
    max: String(max),
    sortby: 'publishedAt',
  });
}
