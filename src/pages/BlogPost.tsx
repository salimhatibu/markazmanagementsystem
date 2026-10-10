import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { CursorToast } from "../components/CursorToast";
import { api } from "../lib/api";
import { classifyBlogImages } from "../lib/blog-images";
import { ensureFontLoaded, fontById, fontStack } from "../lib/blog-fonts";
import { publicPostUrl, shareUrl } from "../lib/blog-share";
import { usePostDwell } from "../lib/use-post-dwell";
import { useCursorToast } from "../lib/use-cursor-toast";
import type { BlogPost } from "../types";

export function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState("");
  const { toast, showToast } = useCursorToast();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    api<{ post: BlogPost }>(`/api/posts?slug=${encodeURIComponent(slug)}`)
      .then((body) => setPost(body.post))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "That post could not be opened.");
      });
  }, [slug]);

  usePostDwell(post?.id ?? null);

  useLayoutEffect(() => {
    classifyBlogImages(bodyRef.current);
  }, [post?.bodyHtml]);

  useEffect(() => {
    if (post?.fontFamily) ensureFontLoaded(post.fontFamily);
  }, [post?.fontFamily]);

  async function copyPublic(event: { clientX: number; clientY: number }) {
    if (!post) return;
    try {
      const result = await shareUrl(post.title, publicPostUrl(post.slug));
      showToast(result === "copied" ? "The public link is on the clipboard." : "Ready to pass on.", event);
    } catch {
      showToast("The public link could not be copied just then.", event);
    }
  }

  async function remove() {
    if (!post) return;
    if (!window.confirm("Remove this post from the blog?")) return;
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    navigate("/blog/posts");
  }

  if (error) {
    return (
      <>
        <p className="status">{error}</p>
        <Link className="random" to="/blog/posts">
          Back to the shelf
        </Link>
      </>
    );
  }

  if (!post) return <p className="status">Opening the post…</p>;

  const when = post.publishedAt ?? post.createdAt;
  const date = new Date(when);

  return (
    <article className="blog-read">
      <span className="eyebrow">
        {Number.isNaN(date.getTime()) ? "" : formatEatLongDate(date)}
        {!post.published
          ? " · Draft"
          : post.visibility === "private"
            ? " · Private — not listed, visible only by direct link"
            : ""}
      </span>
      <h1>
        {post.title}
      </h1>
      <div className="actions">
        <Link className="random" to="/blog/posts">
          All posts
        </Link>
        <Link className="random" to={`/blog/write/${post.id}`}>
          Edit
        </Link>
        <button type="button" className="random" onClick={(event) => void copyPublic(event)}>
          Copy public link
        </button>
        <button type="button" className="reset" onClick={() => void remove()}>
          Remove
        </button>
      </div>
      <CursorToast toast={toast} />
      {post.coverUrl ? <img src={post.coverUrl} alt="" className="blog-read-cover" /> : null}
      <div
        ref={bodyRef}
        className="blog-body"
        style={{ fontFamily: fontStack(fontById(post.fontFamily)) }}
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
