import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { IconHeart, IconSave, IconShare } from "../components/ig-icons";
import { PaperAlmanac } from "../components/PaperAlmanac";
import { api } from "../lib/api";
import { tagArabicRuns } from "../lib/arabic-runs";
import { classifyBlogImages } from "../lib/blog-images";
import {
  publicPostPath,
  publicPostUrl,
  publicSavedPath,
  publicSeriesPath,
  publicShelfPath,
  shareImageUrl,
  shareUrl,
} from "../lib/blog-share";
import { blogSessionId, trackBlog } from "../lib/blog-track";
import { usePageMeta } from "../lib/page-meta";
import { paperBrief } from "../lib/paper-almanac";
import { usePostDwell } from "../lib/use-post-dwell";
import type { BlogComment, BlogPost } from "../types";

export function PublicPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    api<{ post: BlogPost }>(`/api/posts?slug=${encodeURIComponent(slug)}`)
      .then((body) => setPost(body.post))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "That post could not be opened.");
      });
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const session = blogSessionId();
    const query = `sessionId=${encodeURIComponent(session)}`;
    api<{ comments: BlogComment[] }>(`/api/blog-comments/${post.id}`)
      .then((body) => setComments(body.comments))
      .catch(() => undefined);
    api<{ likes: number; liked: boolean }>(`/api/blog-likes/${post.id}?${query}`)
      .then((body) => {
        setLikes(body.likes);
        setLiked(body.liked);
      })
      .catch(() => undefined);
    api<{ saved: boolean }>(`/api/blog-saves/${post.id}?${query}`)
      .then((body) => setSaved(body.saved))
      .catch(() => undefined);
    api<{ posts: BlogPost[] }>("/api/posts")
      .then((body) => {
        const others = body.posts.filter((item) => item.id !== post.id);
        const same = post.seriesSlug ? others.filter((item) => item.seriesSlug === post.seriesSlug) : [];
        setRelated((same.length ? same : others).slice(0, 6));
      })
      .catch(() => undefined);
  }, [post]);

  usePostDwell(post?.id ?? null);

  usePageMeta(
    post
      ? {
          title: `${post.title} · The سلفية mindset`,
          description: paperBrief(post.excerpt, 200),
          image: shareImageUrl(post.coverUrl),
          url: publicPostUrl(post.slug),
          type: "article",
          publishedAt: post.publishedAt,
        }
      : null,
  );

  useLayoutEffect(() => {
    classifyBlogImages(bodyRef.current);
    tagArabicRuns(bodyRef.current);
  }, [post?.bodyHtml]);

  async function toggleLike() {
    if (!post) return;
    try {
      const body = await api<{ likes: number; liked: boolean }>(`/api/blog-likes/${post.id}`, {
        method: "POST",
        body: JSON.stringify({ sessionId: blogSessionId() }),
      });
      setLikes(body.likes);
      setLiked(body.liked);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "That could not be marked.");
    }
  }

  async function toggleSave() {
    if (!post) return;
    try {
      const body = await api<{ saved: boolean }>(`/api/blog-saves/${post.id}`, {
        method: "POST",
        body: JSON.stringify({ sessionId: blogSessionId() }),
      });
      setSaved(body.saved);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "That could not be saved.");
    }
  }

  async function share() {
    if (!post) return;
    setNotice("");
    try {
      const result = await shareUrl(post.title, publicPostUrl(post.slug));
      setNotice(result === "copied" ? "The link is on the clipboard." : "Ready to pass on.");
    } catch {
      setNotice("The link could not be shared just then.");
    }
  }

  async function sendNote() {
    if (!post) return;
    setBusy(true);
    setNotice("");
    try {
      const body = await api<{ comment: BlogComment }>(`/api/blog-comments/${post.id}`, {
        method: "POST",
        body: JSON.stringify({ body: note, sessionId: blogSessionId() }),
      });
      setComments((current) => [...current, body.comment]);
      setNote("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The note could not be left.");
    } finally {
      setBusy(false);
    }
  }

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

  if (!post) return <p className="status">Opening the post…</p>;

  const when = post.publishedAt ?? post.createdAt;
  const date = new Date(when);
  const pull = paperBrief(post.excerpt, 220);

  return (
    <>
      <section className="paper-lead" id="the-piece">
        <article className="paper-lead-main">
          <p className="paper-section-kicker">
            {post.seriesSlug ? (
              <Link to={publicSeriesPath(post.seriesSlug)}>{post.seriesTitle}</Link>
            ) : (
              "Essay"
            )}{" "}
            · <span lang="ar" dir="rtl">مقال</span>
          </p>
          <h2 className="paper-headline">
            {post.title}
          </h2>
          <p className="paper-byline">
            {Number.isNaN(date.getTime()) ? "A public paper" : `${formatEatLongDate(date)} · A public paper`}
          </p>
          <div className="blog-ig-bar">
            <div className="blog-ig-cluster">
              <button
                type="button"
                className={liked ? "blog-ig-btn is-liked" : "blog-ig-btn"}
                aria-pressed={liked}
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => void toggleLike()}
              >
                <IconHeart filled={liked} />
              </button>
              <button type="button" className="blog-ig-btn" aria-label="Share" onClick={() => void share()}>
                <IconShare />
              </button>
            </div>
            <button
              type="button"
              className={saved ? "blog-ig-btn is-saved" : "blog-ig-btn"}
              aria-pressed={saved}
              aria-label={saved ? "Remove save" : "Save"}
              onClick={() => void toggleSave()}
            >
              <IconSave filled={saved} />
            </button>
          </div>
          {likes > 0 ? (
            <p className="blog-ig-count">
              {likes} {likes === 1 ? "like" : "likes"}
            </p>
          ) : null}
          {notice ? <p className="status">{notice}</p> : null}
          {post.coverUrl ? <img src={post.coverUrl} alt="" className="blog-read-cover" /> : null}
          <div
            ref={bodyRef}
            className="blog-body paper-drop"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
        </article>
        <aside className="paper-rail">
          <PaperAlmanac note="The calendar of this paper follows both the Gregorian day and the Hijri month." />
          {pull ? (
            <blockquote className="paper-pull">
              <p>{pull}</p>
              <footer>— from this piece</footer>
            </blockquote>
          ) : null}
          <Link className="paper-rail-link" to={publicSavedPath()}>
            Saved papers
          </Link>
          <Link className="paper-rail-link" to={publicShelfPath()}>
            All papers
          </Link>
        </aside>
      </section>

      {related.length ? (
        <section className="paper-briefs" id="continued" aria-labelledby="continued-title">
          <h2 id="continued-title" className="paper-section-head">
            {post.seriesTitle ? `Also in ${post.seriesTitle}` : "Also in this paper"}
          </h2>
          {related.map((item) => (
            <article key={item.id} className="paper-brief">
              <p className="paper-section-kicker">Paper · صحيفة</p>
              <h3>
                <Link to={publicPostPath(item.slug)} onClick={() => trackBlog("click", item.id)}>
                  {item.title}
                </Link>
              </h3>
              {item.excerpt ? <p>{paperBrief(item.excerpt)}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className="paper-letters" id="letters" aria-labelledby="notes-title">
        <h2 id="notes-title" className="paper-section-head">
          Letters · <span lang="ar" dir="rtl">رسائل</span>
        </h2>
        <p className="paper-letters-lede">
          Unsigned notes from readers. No name is taken.
        </p>
        <form
          className="blog-note-form"
          onSubmit={(event) => {
            event.preventDefault();
            void sendNote();
          }}
        >
          <label className="blog-field">
            <span className="eyebrow">Leave a letter</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={2000}
              required
              placeholder="A short remark. No name is taken."
            />
          </label>
          <button type="submit" className="finish" disabled={busy}>
            {busy ? "Sending…" : "Post the letter"}
          </button>
        </form>
        <ol className="blog-notes">
          {comments.map((item) => (
            <li key={item.id}>
              <time>{formatEatLongDate(new Date(item.createdAt))}</time>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
