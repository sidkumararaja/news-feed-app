// Tiny request/response helpers that work identically on the Vercel Node
// runtime and the local dev emulator (scripts/dev.mjs). We deliberately
// avoid Vercel-specific request helpers so handlers stay portable.

export function getQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams);
}

export async function readJsonBody(req) {
  // Vercel may have already parsed the body for us.
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
