import { readJsonBody, sendJson } from './_lib/http.js';
import { loadStore, saveStore, defaultStore } from './_lib/storage.js';
import { tokenize } from './_lib/scoring.js';

// POST   — "not interested": hide the article permanently and down-weight
//          the terms and source that put it in the feed, so similar articles
//          rank lower in future.
// DELETE — reset all learned preferences (dismissals + penalties).
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { articleId, title, source, terms } = body;
      if (!articleId) {
        sendJson(res, 400, { error: 'articleId is required' });
        return;
      }
      const store = await loadStore();
      store.dismissed[articleId] = {
        dismissedAt: new Date().toISOString(),
        title: title ?? null,
        source: source ?? null,
      };
      // Penalties are keyed by normalized token, the same form the scorer
      // looks up, so a dismissal of "board game" also dampens "board games".
      for (const keyword of Array.isArray(terms) ? terms : []) {
        for (const token of tokenize(String(keyword))) {
          store.penalties.terms[token] = (store.penalties.terms[token] ?? 0) + 1;
        }
      }
      if (source) {
        store.penalties.sources[source] =
          (store.penalties.sources[source] ?? 0) + 1;
      }
      await saveStore(store);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const store = await loadStore();
      const fresh = defaultStore();
      store.dismissed = fresh.dismissed;
      store.penalties = fresh.penalties;
      await saveStore(store);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}
