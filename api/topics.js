import { getQuery, readJsonBody, sendJson } from './_lib/http.js';
import { loadStore, saveStore } from './_lib/storage.js';

function slugify(label) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `topic-${Date.now()}`
  );
}

function parseKeywords(input) {
  const list = Array.isArray(input) ? input : String(input ?? '').split(',');
  return [...new Set(list.map((k) => String(k).trim()).filter(Boolean))];
}

export default async function handler(req, res) {
  try {
    const store = await loadStore();

    if (req.method === 'GET') {
      sendJson(res, 200, { topics: store.topics });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const label = String(body.label ?? '').trim();
      const keywords = parseKeywords(body.keywords);
      if (!label || keywords.length === 0) {
        sendJson(res, 400, { error: 'A topic needs a label and at least one keyword.' });
        return;
      }
      let id = slugify(label);
      while (store.topics.some((t) => t.id === id)) id += '-2';
      const topic = { id, label, keywords };
      store.topics.push(topic);
      await saveStore(store);
      sendJson(res, 201, { topic, topics: store.topics });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = getQuery(req);
      const before = store.topics.length;
      store.topics = store.topics.filter((t) => t.id !== id);
      if (store.topics.length === before) {
        sendJson(res, 404, { error: `No topic with id "${id}".` });
        return;
      }
      await saveStore(store);
      sendJson(res, 200, { topics: store.topics });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}
