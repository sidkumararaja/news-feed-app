import { useCallback, useEffect, useState } from 'react';
import ArticleCard from './components/ArticleCard.jsx';
import TopicManager from './components/TopicManager.jsx';

export default function App() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

      {error && <p className="error">Couldn't load the feed: {error}</p>}
      {loading && !feed && <p className="loading">Setting the presses…</p>}

      {feed && (
        <section className="feed" aria-busy={loading}>
          {feed.articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
          {feed.articles.length === 0 && (
            <p className="loading">Nothing matched today. Try broader keywords.</p>
          )}
        </section>
      )}
    </main>
  );
}
