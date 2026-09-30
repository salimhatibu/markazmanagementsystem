import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BlogSeries } from "../types";

type Subscriber = { id: number; email: string; createdAt: string };

export function BlogSeriesPage() {
  const [rows, setRows] = useState<BlogSeries[]>([]);
  const [letters, setLetters] = useState<Subscriber[]>([]);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ series: BlogSeries[] }>("/api/series")
      .then((body) => setRows(body.series))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The series could not be opened.");
      });
    api<{ subscribers: Subscriber[] }>("/api/newsletter")
      .then((body) => setLetters(body.subscribers))
      .catch(() => setLetters([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/series", { method: "POST", body: JSON.stringify({ title, blurb }) });
      setTitle("");
      setBlurb("");
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The series could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(row: BlogSeries, nextTitle: string, nextBlurb: string) {
    setError("");
    try {
      await api(`/api/series/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: nextTitle, blurb: nextBlurb }),
      });
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The series could not be saved.");
    }
  }

  async function remove(row: BlogSeries) {
    if (!window.confirm(`Remove the series “${row.title}”? Posts stay, unfiled.`)) return;
    setError("");
    try {
      await api(`/api/series/${row.id}`, { method: "DELETE" });
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The series could not be removed.");
    }
  }

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">Filed by topic</span>
          <h2>Series</h2>
        </div>
        <p>Marriage, modesty, worship, or any thread you want readers to follow from one paper to the next.</p>
      </section>
      {error ? <p className="status">{error}</p> : null}
      <form className="blog-compose" onSubmit={(event) => void create(event)}>
        <label className="blog-field">
          <span className="eyebrow">New series</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="Marriage" />
        </label>
        <label className="blog-field">
          <span className="eyebrow">A line about it</span>
          <input value={blurb} onChange={(event) => setBlurb(event.target.value)} maxLength={400} />
        </label>
        <button type="submit" className="finish" disabled={busy}>
          {busy ? "Saving…" : "Create series"}
        </button>
      </form>
      <ul className="log">
        {rows.map((row) => (
          <SeriesRow key={row.id} row={row} onSave={saveRow} onRemove={remove} />
        ))}
      </ul>
      <section className="choices-header">
        <div>
          <span className="eyebrow">The letter</span>
          <h2>{letters.length ? `${letters.length} on the list` : "No addresses yet"}</h2>
        </div>
        <p>Readers who asked for a note when a new paper is posted. Mail goes out only when the mailbox is configured.</p>
      </section>
      {letters.length ? (
        <ul className="log">
          {letters.map((person) => (
            <li key={person.id}>
              <time>{person.createdAt.slice(0, 10)}</time>
              <span>{person.email}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function SeriesRow({
  row,
  onSave,
  onRemove,
}: {
  row: BlogSeries;
  onSave: (row: BlogSeries, title: string, blurb: string) => Promise<void>;
  onRemove: (row: BlogSeries) => Promise<void>;
}) {
  const [title, setTitle] = useState(row.title);
  const [blurb, setBlurb] = useState(row.blurb);

  useEffect(() => {
    setTitle(row.title);
    setBlurb(row.blurb);
  }, [row.title, row.blurb]);

  return (
    <li>
      <form
        className="series-row"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(row, title, blurb);
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} aria-label="Series title" />
        <input value={blurb} onChange={(event) => setBlurb(event.target.value)} maxLength={400} aria-label="Series line" />
        <span>{row.publishedCount ?? 0} posted</span>
        <button type="submit">Save</button>
        <button type="button" onClick={() => void onRemove(row)}>
          Remove
        </button>
      </form>
    </li>
  );
}
