# The Daily Relevant — personal news feed

A personalized news feed web app. Articles come from the [GNews API](https://gnews.io) (fetched **server-side only** — the key never reaches the browser), are scored against your stated topics by a small **dependency-free relevance engine**, and are presented in a minimal, editorial reading UI.

## Features

- **Topics you define** — a label plus keywords/phrases (e.g. *AI industry: artificial intelligence, LLM, OpenAI, Anthropic*)
- **Relevance-ranked feed** — headline, source, timestamp, summary, and a relevance tag per article
- **"Why this matched"** — each article explains which of your terms drove its score, and where they appeared
- **Filters** — by topic, source, and date range
- **"Not interested"** — dismissing an article hides it permanently and down-weights its terms and source in future ranking
- **Server-side persistence** — topics, dismissals and learned down-weights survive across browsers/devices
- **Mock mode** — without an API key the app serves bundled sample articles, so you can run and demo it instantly

## Architecture

```
api/                  Vercel serverless functions (Node, zero npm dependencies)
  feed.js             GET  — fetch (cached) → score → rank → return feed
  topics.js           GET/POST/DELETE — manage topics
  feedback.js         POST — "not interested"; DELETE — reset personalization
  _lib/               shared code (not exposed as endpoints)
    gnews.js          GNews client; key from env; mock fallback
    cache.js          in-memory TTL cache for GNews responses
    scoring.js        relevance engine (see below)
    storage.js        JSON-document store: flat file / Upstash Redis REST
    http.js           tiny req/res helpers
src/                  React frontend (Vite)
scripts/dev.mjs       hand-rolled local emulator for /api/* + Vite dev server
```

**Dependencies** (the complete list): `react`, `react-dom` at runtime; `vite`, `@vitejs/plugin-react` at dev/build time. The backend uses only Node built-ins — no HTTP client, no NLP library, no ORM, no dotenv.

## Relevance scoring

Each topic keyword contributes to an article's score across the title (weighted 3×) and summary (1×):

```
contribution = fieldWeight × (1 + ln(tf)) × rarity(term) × penalty(term)
```

- **Log-capped term frequency** — five mentions ≠ five times the score.
- **Batch IDF (`rarity`)** — a term appearing in most of today's articles carries little signal and is down-weighted; a term unique to two articles is boosted. Combined with a stopword list, this stops shared common words from producing false matches.
- **Phrases beat scattered words** — a multi-word keyword matched verbatim ("board game") gets a 2× boost; its words merely co-occurring somewhere score at half weight. Symbol-heavy keywords like `D&D` fall back to raw substring matching.
- **Threshold** — a topic only tags an article above a minimum score, so one weak hit isn't enough.
- **Feedback (`penalty`)** — every "not interested" click increments counters on the article's matched terms (`1/(1+0.5n)` multiplier) and its source (`1/(1+0.75n)` on the final score).

Synonyms are handled by the topic model rather than an NLP package: each topic is a *list* of related terms, and light plural stemming (`games` → `game`) catches inflections.

## Run locally

Requires Node 18+.

```bash
npm install
npm run dev        # → http://localhost:5173
```

That's it — with no key you get sample articles. For live news:

```bash
cp .env.example .env    # then paste your key from https://gnews.io
```

## Deploy to Vercel

1. Push this repo to GitHub, then **Add New → Project** in [Vercel](https://vercel.com/new) and import it. Vercel auto-detects Vite; no build settings needed.
2. In **Project Settings → Environment Variables**, add `GNEWS_API_KEY` (server-side only; it is never bundled into the client).
3. Deploy. `/api/*` becomes serverless functions automatically.
4. **Recommended:** add the Upstash Redis integration from the Vercel Marketplace (free tier). It auto-injects the REST credentials — as `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` depending on how it was installed; the app accepts either pair. Without them, preferences fall back to `/tmp`, which resets whenever the function instance is recycled (the app shows a banner when this is the case). Redeploy after adding the integration so the functions pick up the new variables.

> **Note:** the app is single-user and has no auth — anyone with the URL can edit your topics. Keep the URL private, or enable Vercel Deployment Protection.

## Staying inside the GNews free tier

The free tier allows 100 requests/day **and** rate-limits bursts of requests in a short window. The backend defends both budgets:

- **One request per topic per cache window** (default 60 minutes, tune with `GNEWS_CACHE_TTL_MINUTES`); page loads in between are served from cache. Five topics at the default TTL is ~120 requests/day worst case — in practice far fewer, since requests only happen when someone loads the feed.
- **The cache is written through to Upstash Redis** when configured, so serverless cold starts reuse it instead of re-fetching.
- **Uncached topic fetches run sequentially** with a ~1s gap, retry once after a backoff if GNews rate-limits the burst, and fall back to the most recent cached copy (kept 24h) rather than erroring.

GNews's terms permit "reasonable caching of API responses for application performance"; attribution is appreciated (footer link included).
