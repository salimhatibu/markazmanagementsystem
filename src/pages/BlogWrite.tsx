import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BlogEditor } from "../components/BlogEditor";
import { api } from "../lib/api";
import { uploadBlogMedia } from "../lib/blog-media";
import { imageFilesFromClipboard } from "../lib/blog-images";
import type { BlogPost, BlogSeries } from "../types";

export function BlogWritePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState<BlogSeries[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!editing);

  useEffect(() => {
    if (!id) return;
    api<{ post: BlogPost }>(`/api/posts/${id}`)
      .then((body) => {
        setTitle(body.post.title);
        setBodyHtml(body.post.bodyHtml);
        setCoverUrl(body.post.coverUrl);
        setCoverKey(body.post.coverKey);
        setPublished(body.post.published);
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

  async function save(makePublic: boolean) {
    setBusy(true);
    setError("");
    try {
      const nextPublished = makePublic || published;
      const payload = JSON.stringify({
        title,
        bodyHtml,
        coverKey,
        published: nextPublished,
        seriesId: seriesId ? Number(seriesId) : null,
      });
      const body = editing
        ? await api<{ post: BlogPost }>(`/api/posts/${id}`, { method: "PUT", body: payload })
        : await api<{ post: BlogPost }>("/api/posts", { method: "POST", body: payload });
      setPublished(body.post.published);
      if (nextPublished) navigate(`/blog/${body.post.slug}`);
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

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">{editing ? "Revise the page" : "A blank page"}</span>
          <h2>{editing ? "Edit post" : "Write a post"}</h2>
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
            void save(false);
          }}
        >
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
            <span className="eyebrow">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={255} />
          </label>
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
            {coverUrl ? <img src={coverUrl} alt="" className="blog-cover-preview" /> : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(event) => void onCover(event.target.files?.[0])}
            />
            <p className="blog-paste-hint">Paste a picture here, or choose a file.</p>
          </div>
          <div className="blog-field">
            <span className="eyebrow">The writing</span>
            <BlogEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>
          <div className="actions">
            <button type="submit" className="random" disabled={busy}>
              {busy ? "Saving…" : published ? "Save changes" : "Save draft"}
            </button>
            <button type="button" className="finish" disabled={busy} onClick={() => void save(true)}>
              {busy ? "Posting…" : published ? "Update public post ↗" : "Post publicly ↗"}
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
