import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { CursorToast } from "../components/CursorToast";
import { IconShare } from "../components/ig-icons";
import { PaperAlmanac } from "../components/PaperAlmanac";
import { api } from "../lib/api";
import { DEFAULT_SHARE_IMAGE, publicPostPath, publicPostUrl, shareUrl } from "../lib/blog-share";
import { trackBlog, trackImpressions } from "../lib/blog-track";
import { useCursorToast } from "../lib/use-cursor-toast";
import { usePageMeta } from "../lib/page-meta";
import { paperBrief } from "../lib/paper-almanac";
import type { BlogPost } from "../types";

function postedOn(post: BlogPost) {
  const raw = post.publishedAt ?? post.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : formatEatLongDate(date);
}

export function PublicPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const { toast, showToast } = useCursorToast();

  useEffect(() => {
    api<{ posts: BlogPost[] }>("/api/posts")
      .then((body) => {
        setPosts(body.posts);
        trackImpressions(body.posts.map((post) => post.id));
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The papers could not be opened.");
        setReady(true);
      });
  }, []);

  async function share(post: BlogPost, event: { clientX: number; clientY: number }) {
    try {
      const result = await shareUrl(post.title, publicPostUrl(post.slug));
      showToast(result === "copied" ? "The link is on the clipboard." : "Ready to pass on.", event);
    } catch {
      showToast("The link could not be shared just then.", event);
    }
  }

  const lead = posts[0];
  const briefs = posts.slice(1);

  usePageMeta({
    title: "The سلفية mindset",
    description: "Your daily dose of salafiyyah — essays printed digitally, read slowly.",
    image: DEFAULT_SHARE_IMAGE,
  });

  return (
    <>
      {error ? <p className="status">{error}</p> : null}
      <CursorToast toast={toast} />
      {!ready ? <p className="status">Opening the papers…</p> : null}
      {ready && !posts.length ? <p className="status">Nothing public yet.</p> : null}

      {lead ? (
        <section className="paper-lead">
          <article className="paper-lead-main">
            <p className="paper-section-kicker">
              Front · <span lang="ar" dir="rtl">صدر</span>
            </p>
            <h2 className="paper-headline">
              <Link to={publicPostPath(lead.slug)} onClick={() => trackBlog("click", lead.id)}>
                {lead.title}
              </Link>
            </h2>
            <p className="paper-byline">{postedOn(lead) ? `${postedOn(lead)} · A public paper` : "A public paper"}</p>
            {lead.excerpt ? (
              <div className="paper-drop paper-drop--excerpt">
                <p>{lead.excerpt}</p>
              </div>
            ) : null}
            <div className="paper-lead-actions">
              <Link className="paper-rail-link" to={publicPostPath(lead.slug)} onClick={() => trackBlog("click", lead.id)}>
                Read the piece
              </Link>
              <button
                type="button"
                className="blog-ig-btn"
                aria-label={`Share ${lead.title}`}
                onClick={(event) => void share(lead, event)}
              >
                <IconShare />
              </button>
            </div>
          </article>
          <aside className="paper-rail">
            <PaperAlmanac note="Open a piece, leave a letter, mark it, save it, or pass the link on." />
            {lead.excerpt ? (
              <blockquote className="paper-pull">
                <p>{paperBrief(lead.excerpt, 160)}</p>
                <footer>— from the front piece</footer>
              </blockquote>
            ) : null}
          </aside>
        </section>
      ) : null}

      {briefs.length ? (
        <section className="paper-briefs" aria-labelledby="briefs-title">
          <h2 id="briefs-title" className="paper-section-head">
            In this issue
          </h2>
          {briefs.map((post) => (
            <article key={post.id} className="paper-brief">
              <p className="paper-section-kicker">Paper · صحيفة</p>
              <h3>
                <Link to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                  {post.title}
                </Link>
              </h3>
              {post.excerpt ? <p>{paperBrief(post.excerpt)}</p> : null}
              <div className="paper-brief-actions">
                <Link className="paper-rail-link" to={publicPostPath(post.slug)} onClick={() => trackBlog("click", post.id)}>
                  Read
                </Link>
                <button
                  type="button"
                  className="blog-ig-btn"
                  aria-label={`Share ${post.title}`}
                  onClick={(event) => void share(post, event)}
                >
                  <IconShare />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
