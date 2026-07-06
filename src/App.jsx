import { useEffect, useState } from 'react';
import ArticleCard from './components/ArticleCard.jsx';

export default function App() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/feed')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
        setFeed(data);
      })
      .catch((e) => setError(e.message));
  }, []);

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

      {error && <p className="error">Couldn't load the feed: {error}</p>}
      {!feed && !error && <p className="loading">Setting the presses…</p>}

      {feed && (
        <section className="feed">
          {feed.articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </section>
      )}
    </main>
  );
}
