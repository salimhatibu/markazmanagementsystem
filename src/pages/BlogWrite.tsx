import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BlogEditor } from "../components/BlogEditor";
import { api } from "../lib/api";
import { uploadBlogMedia } from "../lib/blog-media";
import { imageFilesFromClipboard } from "../lib/blog-images";
import { BLOG_FONTS, ensureFontLoaded, fontById, fontStack } from "../lib/blog-fonts";
import type { BlogPost, BlogSeries, BlogVisibility } from "../types";

type PostStatus = "draft" | "public" | "private";

function statusOf(post: Pick<BlogPost, "published" | "visibility">): PostStatus {
  if (!post.published) return "draft";
  return post.visibility === "private" ? "private" : "public";
}

const STATUS_HINTS: Record<PostStatus, string> = {
  draft: "Only you can see this. It won't appear anywhere on the blog yet.",
  public: "Shown on the Read page and in listings — anyone can find it.",
  private: "Not shown on the Read page or in any listing. Only someone with the direct link can open it.",
};

export function BlogWritePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PostStatus>("draft");
  const [fontFamily, setFontFamily] = useState("default");
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState<BlogSeries[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!editing);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    api<{ post: BlogPost }>(`/api/posts/${id}`)
      .then((body) => {
        setTitle(body.post.title);
        setBodyHtml(body.post.bodyHtml);
        setCoverUrl(body.post.coverUrl);
        setCoverKey(body.post.coverKey);
        setStatus(statusOf(body.post));
        setFontFamily(body.post.fontFamily ?? "default");
        setSeriesId(body.post.seriesId ? String(body.post.seriesId) : "");
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "That draft could not be opened.");
        setReady(true);
      });
  }, [id]);

  useEffect(() => {
    api<{ series: BlogSeries[] }>("/api/series")
      .then((body) => setSeriesList(body.series))
      .catch(() => setSeriesList([]));
  }, []);

  useEffect(() => {
    ensureFontLoaded(fontFamily);
  }, [fontFamily]);

  const activeFont = useMemo(() => fontById(fontFamily), [fontFamily]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const published = status !== "draft";
      const visibility: BlogVisibility = status === "private" ? "private" : "public";
      const payload = JSON.stringify({
        title,
        bodyHtml,
        coverKey,
        published,
        visibility,
        fontFamily,
        seriesId: seriesId ? Number(seriesId) : null,
      });
      const body = editing
        ? await api<{ post: BlogPost }>(`/api/posts/${id}`, { method: "PUT", body: payload })
        : await api<{ post: BlogPost }>("/api/posts", { method: "POST", body: payload });
      setStatus(statusOf(body.post));
      if (published) navigate(`/blog/${body.post.slug}`);
      else navigate(`/blog/write/${body.post.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The post could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function onCover(file: File | undefined) {
    if (!file) return;
    try {
      const payload = await uploadBlogMedia(file);
      setCoverKey(payload.key);
      setCoverUrl(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The cover picture could not be saved.");
    }
  }

  function removeCover() {
    setCoverKey(null);
    setCoverUrl(null);
    if (coverInput.current) coverInput.current.value = "";
  }

  const saveLabel = busy
    ? "Saving…"
    : status === "draft"
      ? "Save draft"
      : status === "private"
        ? "Save privately ↗"
        : "Post publicly ↗";

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">{editing ? "Revise the page" : "A blank page"}</span>
          <h2>
            {editing ? "Edit post" : "Write a post"}
          </h2>
        </div>
        <p>Shape the page: titles, pictures, video. Paste a photograph from the clipboard if you prefer. Post it when it is ready.</p>
      </section>
      {error ? <p className="status">{error}</p> : null}
      {!ready ? <p className="status">Opening the draft…</p> : null}
      {ready ? (
        <form
          className="blog-compose"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="blog-field">
            <span className="eyebrow">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={255}
              placeholder="Give the piece a title"
            />
          </label>
          <div className="blog-settings-grid">
            <label className="blog-field">
              <span className="eyebrow">Series</span>
              <select value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
                <option value="">None</option>
                {seriesList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="blog-field">
              <span className="eyebrow">Visibility</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as PostStatus)}>
                <option value="draft">Draft</option>
                <option value="public">Public</option>
                <option value="private">Private (unlisted)</option>
              </select>
            </label>
            <label className="blog-field">
              <span className="eyebrow">Font</span>
              <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                {BLOG_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-hint blog-visibility-hint">{STATUS_HINTS[status]}</p>
          <div
            className="blog-field"
            onPaste={(event) => {
              const files = imageFilesFromClipboard(event.clipboardData);
              if (!files.length) return;
              event.preventDefault();
              void onCover(files[0]);
            }}
          >
            <span className="eyebrow">Cover picture</span>
            {coverUrl ? (
              <div className="blog-cover-row">
                <img src={coverUrl} alt="" className="blog-cover-preview" />
                <div className="blog-cover-row-actions">
                  <button type="button" className="ghost" onClick={() => coverInput.current?.click()}>
                    Replace
                  </button>
                  <button type="button" className="text-button" onClick={removeCover}>
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden={Boolean(coverUrl)}
              onChange={(event) => void onCover(event.target.files?.[0])}
            />
            <p className="blog-paste-hint">Paste a picture here, or choose a file.</p>
          </div>
          <div className="blog-field">
            <span className="eyebrow">The writing</span>
            <BlogEditor value={bodyHtml} onChange={setBodyHtml} fontFamily={fontStack(activeFont)} />
          </div>
          <div className="actions blog-write-actions">
            <button type="submit" className="finish" disabled={busy}>
              {saveLabel}
            </button>
            <Link className="reset" to="/blog/posts">
              Back to the shelf
            </Link>
          </div>
        </form>
      ) : null}
    </>
  );
}
