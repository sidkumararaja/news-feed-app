import { useCallback, useEffect, useMemo, useState } from 'react';
import ArticleCard from './components/ArticleCard.jsx';
import TopicManager from './components/TopicManager.jsx';
import FilterBar, { applyFilters } from './components/FilterBar.jsx';

export default function App() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ topic: 'all', source: 'all', range: 'all' });

  const sources = useMemo(
    () => [...new Set((feed?.articles ?? []).map((a) => a.source.name))].sort(),
    [feed]
  );
  const visible = useMemo(
    () => applyFilters(feed?.articles ?? [], filters),
    [feed, filters]
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/feed');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
      setFeed(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <main className="page">
      <header className="masthead">
        <h1>The Daily Relevant</h1>
        <p className="tagline">News, ranked by what you actually care about.</p>
      </header>

      {feed?.mock && (
        <p className="notice">
          Showing sample articles — set <code>GNEWS_API_KEY</code> to fetch live
          news.
        </p>
      )}

      {feed && <TopicManager topics={feed.topics} onChanged={loadFeed} />}
      {feed && (
        <FilterBar
          topics={feed.topics}
          sources={sources}
          filters={filters}
          onChange={setFilters}
        />
      )}

      {error && <p className="error">Couldn't load the feed: {error}</p>}
      {loading && !feed && <p className="loading">Setting the presses…</p>}

      {feed && (
        <section className="feed" aria-busy={loading}>
          {visible.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
          {visible.length === 0 && (
            <p className="loading">
              {feed.articles.length === 0
                ? 'Nothing matched today. Try broader keywords.'
                : 'No articles match the current filters.'}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
