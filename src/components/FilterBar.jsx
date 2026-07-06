const DATE_RANGES = [
  { id: 'all', label: 'Any time' },
  { id: '24h', label: 'Past 24 hours' },
  { id: '7d', label: 'Past week' },
  { id: '30d', label: 'Past month' },
];

export function applyFilters(articles, filters) {
  const cutoff = {
    '24h': 24 * 3600_000,
    '7d': 7 * 24 * 3600_000,
    '30d': 30 * 24 * 3600_000,
  }[filters.range];

  return articles.filter((a) => {
    if (filters.topic !== 'all' && !a.matches?.some((m) => m.topicId === filters.topic)) {
      return false;
    }
    if (filters.source !== 'all' && a.source.name !== filters.source) return false;
    if (cutoff && Date.now() - new Date(a.publishedAt).getTime() > cutoff) {
      return false;
    }
    return true;
  });
}

export default function FilterBar({ topics, sources, filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="filter-bar">
      <label>
        Topic
        <select value={filters.topic} onChange={set('topic')}>
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Source
        <select value={filters.source} onChange={set('source')}>
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Published
        <select value={filters.range} onChange={set('range')}>
          {DATE_RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
