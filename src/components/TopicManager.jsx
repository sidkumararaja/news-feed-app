import { useState } from 'react';

export default function TopicManager({ topics, onChanged }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function addTopic(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, keywords }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to add topic');
      setLabel('');
      setKeywords('');
      onChanged(data.topics);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTopic(id) {
    setBusy(true);
    try {
      const r = await fetch(`/api/topics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await r.json();
      if (r.ok) onChanged(data.topics);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="topics">
      <div className="topics-header">
        <h2 className="section-heading">Your topics</h2>
        <button className="link-button" onClick={() => setOpen(!open)}>
          {open ? 'done' : 'edit'}
        </button>
      </div>
      <ul className="topic-list">
        {topics.map((t) => (
          <li key={t.id} className="topic-chip" title={t.keywords.join(', ')}>
            {t.label}
            {open && (
              <button
                className="chip-remove"
                aria-label={`Remove ${t.label}`}
                disabled={busy}
                onClick={() => removeTopic(t.id)}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {topics.length === 0 && (
          <li className="topic-empty">No topics yet — the feed shows unranked headlines.</li>
        )}
      </ul>
      {open && (
        <form className="topic-form" onSubmit={addTopic}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Topic name (e.g. Space exploration)"
            required
          />
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Keywords, comma-separated (e.g. NASA, SpaceX, rocket launch)"
            required
          />
          <button type="submit" disabled={busy}>
            Add topic
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </section>
  );
}
