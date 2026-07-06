import { timeAgo } from '../lib/format.js';

export default function ArticleCard({ article }) {
  return (
    <article className="article">
      <div className="article-meta">
        <span className="article-source">{article.source.name}</span>
        <span className="article-dot">·</span>
        <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
      </div>
      <h2 className="article-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h2>
      {article.description && (
        <p className="article-summary">{article.description}</p>
      )}
    </article>
  );
}
