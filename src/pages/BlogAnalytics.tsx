import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDwell, formatPct, padCount } from "../lib/blog-stats";
import type { BlogAnalytics } from "../types";

export function BlogAnalyticsPage() {
  const [data, setData] = useState<BlogAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<BlogAnalytics>("/api/blog-analytics")
      .then(setData)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The numbers could not be opened.");
      });
  }, []);

  const maxViews = Math.max(1, ...(data?.posts.map((post) => post.views) ?? [1]));
  const scale = Math.ceil(maxViews / 4) * 4 || 4;
  const stamp =
    !data || data.totals.views === 0
      ? "Still on the brief"
      : data.totals.ctr < 0.05
        ? "Quiet traffic"
        : data.totals.avgDwellMs > 60_000
          ? "People stay"
          : "Case open";

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">Where the time went</span>
          <h2>Statistics of each post.</h2>
        </div>
        <p>Views, time on the page, click-through from the shelf, unique readers, bounce.</p>
      </section>
      {error ? <p className="status">{error}</p> : null}
      {!data && !error ? <p className="status">Counting…</p> : null}
      {data ? (
        <div className="workspace">
          <section aria-labelledby="chart-title">
            <div className="section-title">
              <h2 id="chart-title">Where the time went</h2>
              <small>VIEWS / EACH PUBLIC NOTE</small>
            </div>
            <div className="chart" role="img" aria-label="Views by post">
              {data.posts.filter((post) => post.published).length === 0 ? (
                <p className="chart-caption">No public posts yet. Numbers appear after something is posted.</p>
              ) : (
                data.posts
                  .filter((post) => post.published)
                  .map((post) => (
                    <div key={post.id} className="chart-row">
                      <span className="name">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </span>
                      <div className="track">
                        <div className="bar" style={{ width: `${(post.views / scale) * 100}%`, ["--color" as string]: post.color }} />
                      </div>
                      <span className="value">{post.views}</span>
                    </div>
                  ))
              )}
            </div>
            <div className="axis" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((tick) => (
                <span key={tick}>{(scale * tick) / 4}</span>
              ))}
            </div>
            <p className="chart-caption">
              A view is one device, however often it returns. Click-through is devices that opened a piece from the shelf, over devices that saw it there. Stay is the average time the page was actually on screen.
            </p>
            <div className="totals">
              <div>
                <span className="eyebrow">Views</span>
                <strong className="total-number">{data.totals.views}</strong>
              </div>
              <div>
                <span className="eyebrow">Click-through</span>
                <strong className="total-number red">{formatPct(data.totals.ctr)}</strong>
              </div>
              <div>
                <span className="eyebrow">Avg. stay</span>
                <strong className="total-number">{formatDwell(data.totals.avgDwellMs)}</strong>
              </div>
            </div>
            <div className="blog-stat-table">
              {data.posts.map((post) => (
                <article key={post.id}>
                  <span className="eyebrow">{post.published ? "Public" : "Draft"}</span>
                  <h3>
                    <Link to={post.published ? `/blog/${post.slug}` : `/blog/write/${post.id}`}>{post.title}</Link>
                  </h3>
                  <dl>
                    <div>
                      <dt>Views</dt>
                      <dd>{post.views}</dd>
                    </div>
                    <div>
                      <dt>Unique</dt>
                      <dd>{post.uniqueReaders}</dd>
                    </div>
                    <div>
                      <dt>Stay</dt>
                      <dd>{formatDwell(post.avgDwellMs)}</dd>
                    </div>
                    <div>
                      <dt>CTR</dt>
                      <dd>{formatPct(post.ctr)}</dd>
                    </div>
                    <div>
                      <dt>Bounce</dt>
                      <dd>{formatPct(post.bounceRate)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
          <aside className="aside">
            <div>
              <span className="eyebrow">Readers counted</span>
              <div className="clock">
                <span>{padCount(data.totals.uniqueReaders)}</span>
                <small>unique</small>
              </div>
              <span className="eyebrow">Posted: {padCount(data.totals.postsPublished)}</span>
              <div className="stamp">{stamp}</div>
            </div>
            <div>
              <p className="log-title">Notes from the incident</p>
              <ol className="log">
                {data.recent.length === 0 ? (
                  <li>
                    <time>00:00 / OPENED</time>
                    No one has opened a post yet. The shelf is waiting.
                  </li>
                ) : (
                  data.recent.map((item, index) => (
                    <li key={`${item.at}-${index}`}>
                      <time>
                        {new Date(item.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} /{" "}
                        {item.kind.toUpperCase()}
                      </time>
                      {item.title}
                      {item.kind === "dwell" && item.dwellMs != null ? ` · ${formatDwell(item.dwellMs)}` : ""}
                    </li>
                  ))
                )}
              </ol>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
