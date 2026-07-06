import { fetchTopHeadlines, isMockMode } from './_lib/gnews.js';
import { sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  try {
    const { articles, fromCache } = await fetchTopHeadlines();
    sendJson(res, 200, { articles, mock: isMockMode(), fromCache });
  } catch (err) {
    sendJson(res, 502, { error: err.message });
  }
}
