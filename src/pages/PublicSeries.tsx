import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { publicPostPath, publicShelfPath } from "../lib/blog-share";
import { trackBlog } from "../lib/blog-track";
import { usePageMeta } from "../lib/page-meta";
import { paperBrief } from "../lib/paper-almanac";
import type { BlogPost, BlogSeries } from "../types";

export function PublicSeriesPage() {
  const { slug } = useParams();
  const [series, setSeries] = useState<BlogSeries | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api<{ series: BlogSeries; posts: BlogPost[] }>(`/api/series/${encodeURIComponent(slug)}`)
      .then((body) => {
        setSeries(body.series);
        setPosts(body.posts);
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "That series could not be opened.");
        setReady(true);
      });
  }, [slug]);

  usePageMeta(
    series
      ? {
          title: `${series.title} · The سلفية mindset`,
          description: series.blurb || `Papers filed under ${series.title}.`,
        }
      : null,
  );

  if (error) {
    return (
      <section className="paper-status">
        <p className="status">{error}</p>
        <Link className="paper-rail-link" to={publicShelfPath()}>
          Back to the papers
        </Link>
      </section>
    );
  }

  if (!ready || !series) return <p className="status">Opening the series…</p>;

  return (
    <>
      <header className="paper-series-head">
        <p className="paper-section-kicker">Series</p>
        <h2 id="series-title" className="paper-headline">
          {series.title}
        </h2>
        {series.blurb ? <p className="paper-byline">{series.blurb}</p> : null}
      </header>
      {!posts.length ? <p className="status">Nothing in this series yet.</p> : null}
      {posts.length ? (
        <section className="paper-briefs" aria-labelledby="series-title">
          {posts.map((post) => (
            <article key={post.id} className="paper-brief">
              <h3>
                <Link to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                  {post.title}
                </Link>
              </h3>
              {post.excerpt ? <p>{paperBrief(post.excerpt)}</p> : null}
              <Link className="paper-rail-link" to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                Read
              </Link>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
