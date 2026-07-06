// Dependency-free relevance scoring.
//
// Each topic is a label plus a list of keywords/phrases. An article's score
// against a topic is the sum of its keyword contributions over the title
// (weighted 3x) and description (1x):
//
//   contribution = fieldWeight * (1 + ln(tf)) * rarity(term) * penalty(term)
//
// - tf is capped logarithmically so a keyword repeated five times doesn't
//   score five times higher than one mention.
// - rarity is an IDF-style factor computed across the fetched batch: a term
//   that appears in most of today's articles (e.g. "market") tells us little,
//   so it contributes less than a term unique to a few articles.
// - Multi-word keywords matched as an exact phrase get a 2x boost; if the
//   words are present but scattered, each word scores at half weight. This
//   is the main guard against false positives like "board" alone matching
//   "board of directors" for a "board game" topic.
// - A stopword list plus a minimum score threshold keep single common words
//   from tagging an article by themselves.
// - penalty() applies multiplicative down-weights learned from
//   "not interested" clicks (see feedback.js); dismissed sources also
//   down-weight the article's final score.

const STOPWORDS = new Set(
  (
    'a an and are as at be but by for from has have in into is it its of on or ' +
    'that the their this to was were will with you your not what when where who ' +
    'how why all can could should would may might just than then there these ' +
    'those they them he she his her we our us new news says said say today ' +
    'report reports announced announces year years week month day amid after ' +
    'over more most other some about against between during through'
  ).split(/\s+/)
);

// Lowercase, strip punctuation, drop stopwords, light plural stemming.
export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map(stem);
}

function stem(token) {
  if (token.length > 3 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 3 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function counts(tokens) {
  const map = new Map();
  for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
  return map;
}

// IDF-style rarity across the current batch of articles, in [0.15, ~2.5].
function buildRarity(articles) {
  const df = new Map();
  for (const a of articles) {
    const seen = new Set(tokenize(`${a.title} ${a.description}`));
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = Math.max(articles.length, 1);
  return (term) => {
    const d = df.get(term) ?? 0;
    return Math.max(0.15, Math.log((n + 1) / (d + 0.5)));
  };
}

const TITLE_WEIGHT = 3;
const DESC_WEIGHT = 1;
const PHRASE_BOOST = 2;
const SCATTERED_FACTOR = 0.5;
// A topic only tags an article above this score — one weak single-word hit
// in the description (1 * ~1.0 rarity) stays below it.
export const MIN_TOPIC_SCORE = 1.2;

function termPenalty(term, penalties) {
  const count = penalties?.terms?.[term] ?? 0;
  return 1 / (1 + 0.5 * count);
}

function sourcePenalty(name, penalties) {
  const count = penalties?.sources?.[name] ?? 0;
  return 1 / (1 + 0.75 * count);
}

// Score one article against one topic. Returns { score, terms } where terms
// explain which keywords drove the match and where they appeared.
function scoreTopic(article, topic, rarity, penalties) {
  const fields = [
    { name: 'title', raw: (article.title || '').toLowerCase(), weight: TITLE_WEIGHT },
    { name: 'summary', raw: (article.description || '').toLowerCase(), weight: DESC_WEIGHT },
  ];
  for (const f of fields) f.counts = counts(tokenize(f.raw));

  let score = 0;
  const matched = [];

  for (const keyword of topic.keywords) {
    const kwTokens = tokenize(keyword);

    // Keywords that tokenize to nothing (symbol-heavy ones like "D&D" or
    // "C++") fall back to a raw substring match.
    if (kwTokens.length === 0) {
      const needle = keyword.toLowerCase().trim();
      if (!needle) continue;
      for (const field of fields) {
        if (field.raw.includes(needle)) {
          const value = field.weight * PHRASE_BOOST;
          score += value;
          matched.push({ term: keyword, field: field.name, value });
        }
      }
      continue;
    }

    for (const field of fields) {
      if (kwTokens.length === 1) {
        const term = kwTokens[0];
        const tf = field.counts.get(term) ?? 0;
        if (tf === 0) continue;
        const value =
          field.weight * (1 + Math.log(tf)) * rarity(term) * termPenalty(term, penalties);
        score += value;
        matched.push({ term: keyword, field: field.name, value });
      } else {
        // Multi-word keyword: exact phrase beats scattered words.
        const phraseHit = field.raw.includes(keyword.toLowerCase());
        const present = kwTokens.filter((t) => field.counts.has(t));
        if (phraseHit) {
          const avgRarity =
            kwTokens.reduce((s, t) => s + rarity(t), 0) / kwTokens.length;
          const pen =
            kwTokens.reduce((s, t) => s + termPenalty(t, penalties), 0) / kwTokens.length;
          const value = field.weight * PHRASE_BOOST * avgRarity * pen;
          score += value;
          matched.push({ term: keyword, field: field.name, value });
        } else if (present.length === kwTokens.length) {
          let value = 0;
          for (const t of kwTokens) {
            value +=
              field.weight * SCATTERED_FACTOR * rarity(t) * termPenalty(t, penalties);
          }
          value /= kwTokens.length;
          score += value;
          matched.push({ term: keyword, field: field.name, value });
        }
      }
    }
  }

  // Deduplicate explanation terms, keep the strongest few.
  const byTerm = new Map();
  for (const m of matched) {
    const prev = byTerm.get(m.term);
    if (!prev || m.value > prev.value) byTerm.set(m.term, m);
  }
  const terms = [...byTerm.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map(({ term, field }) => ({ term, field }));

  return { score, terms };
}

export function relevanceTag(score) {
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

// Score a batch of articles against all topics. Returns new article objects
// with { matches, relevance, tag } added, sorted by relevance then recency.
export function scoreArticles(articles, topics, penalties = {}) {
  const rarity = buildRarity(articles);

  const scored = articles.map((article) => {
    const matches = [];
    for (const topic of topics) {
      const { score, terms } = scoreTopic(article, topic, rarity, penalties);
      if (score >= MIN_TOPIC_SCORE) {
        matches.push({
          topicId: topic.id,
          label: topic.label,
          score: Number(score.toFixed(2)),
          terms,
        });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    const base = matches.reduce((sum, m) => sum + m.score, 0);
    const relevance = Number(
      (base * sourcePenalty(article.source?.name, penalties)).toFixed(2)
    );
    return { ...article, matches, relevance, tag: relevanceTag(relevance) };
  });

  return scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
}
