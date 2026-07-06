import { fetchTopHeadlines, searchArticles, isMockMode } from './_lib/gnews.js';
import { scoreArticles } from './_lib/scoring.js';
import { loadStore } from './_lib/storage.js';
import { sendJson } from './_lib/http.js';

// Build one GNews search query per topic. Quoted phrases + OR keeps recall
// high; scoring downstream handles precision.
function topicQuery(topic) {
  return topic.keywords
    .slice(0, 6)
    .map((k) => (k.includes(' ') ? `"${k}"` : k))
    .join(' OR ');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  try {
    const store = await loadStore();
    const topics = store.topics;

    let articles;
    let fromCache = true;
    if (topics.length === 0) {
      const result = await fetchTopHeadlines();
      articles = result.articles;
      fromCache = result.fromCache;
    } else {
      // One cached request per topic; results are merged and de-duplicated,
      // then every article is scored against every topic. Uncached fetches
      // run sequentially with a pause between them — GNews's free tier
      // rate-limits bursts, so parallel requests get blocked.
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const byId = new Map();
      let uncachedFetches = 0;
      for (const t of topics) {
        if (uncachedFetches > 0) await sleep(1100);
        const r = await searchArticles(topicQuery(t));
        if (!r.fromCache) uncachedFetches += 1;
        fromCache = fromCache && r.fromCache;
        for (const a of r.articles) byId.set(a.id, a);
      }
      articles = [...byId.values()];
    }

    const scored = scoreArticles(articles, topics, store.penalties).filter(
      (a) => !store.dismissed[a.id]
    );

    sendJson(res, 200, {
      articles: scored,
      topics,
      mock: isMockMode(),
      fromCache,
    });
  } catch (err) {
    sendJson(res, 502, { error: err.message });
  }
}
