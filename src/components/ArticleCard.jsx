import { timeAgo } from '../lib/format.js';

function whyMatched(match) {
  const inTitle = match.terms.filter((t) => t.field === 'title').map((t) => t.term);
  const inSummary = match.terms.filter((t) => t.field === 'summary').map((t) => t.term);
  const parts = [];
  if (inTitle.length) parts.push(`${inTitle.join(', ')} in the headline`);
  if (inSummary.length) parts.push(`${inSummary.join(', ')} in the summary`);
  return parts.join('; ');
}

export default function ArticleCard({ article, onDismiss }) {
  const top = article.matches?.[0];
  return (
    <article className="article">
      <div className="article-meta">
        <span className="article-source">{article.source.name}</span>
        <span className="article-dot">·</span>
        <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
        {top && (
          <span
            className={`relevance-tag relevance-${article.tag}`}
            title={`Relevance ${article.relevance} (${article.tag})`}
          >
            {top.label}
          </span>
        )}
        {onDismiss && (
          <button
            className="dismiss-button"
            title="Hide this article and show fewer like it"
            onClick={() => onDismiss(article)}
          >
            not interested ×
          </button>
        )}
      </div>
      <h2 className="article-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h2>
      {article.description && (
        <p className="article-summary">{article.description}</p>
      )}
      {top && (
        <p className="article-why">
          {top.terms.length > 0 ? (
            <>
              Matched <em>{top.label}</em>: {whyMatched(top)}
            </>
          ) : (
            <>
              From the <em>{top.label}</em> headlines
            </>
          )}
          {article.matches.length > 1 &&
            ` (+ ${article.matches
              .slice(1)
              .map((m) => m.label)
              .join(', ')})`}
        </p>
      )}
    </article>
  );
}
