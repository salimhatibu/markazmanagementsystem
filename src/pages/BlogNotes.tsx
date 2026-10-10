import { useEffect, useState } from "react";
import { formatEat } from "../../shared/format";
import { api } from "../lib/api";
import { publicPostHref } from "../lib/surface";
import type { DeskNotification } from "../types";

export function BlogNotesPage() {
  const [notes, setNotes] = useState<DeskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const body = await api<{ notifications: DeskNotification[] }>("/api/notifications");
        if (cancel) return;
        setNotes(body.notifications.filter((note) => note.kind === "comment"));
        // Opening this page is the admin reading them.
        await api("/api/notifications/read", {
          method: "POST",
          body: JSON.stringify({ kind: "comment" }),
        });
      } catch (caught) {
        if (!cancel) setError(caught instanceof Error ? caught.message : "The notes could not be opened.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const fresh = notes.filter((note) => note.readAt == null).length;

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">From the readers</span>
          <h2>Notes</h2>
        </div>
        <p>
          Every note a reader has left on a paper, newest first.
          {fresh > 0 ? ` ${fresh} ${fresh === 1 ? "is" : "are"} new since you last looked.` : ""}
        </p>
      </section>

      {loading ? (
        <p className="note-state">Opening the notes…</p>
      ) : error ? (
        <p className="note-state is-error">{error}</p>
      ) : notes.length === 0 ? (
        <p className="note-state">No notes yet. When a reader writes on a paper, it arrives here.</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id} className={note.readAt == null ? "note-row is-new" : "note-row"}>
              <div className="note-row-top">
                <span className="note-post">{note.title}</span>
                <time dateTime={note.createdAt}>{formatEat(note.createdAt)}</time>
              </div>
              {note.body ? <p className="note-body">{note.body}</p> : null}
              {note.postSlug ? (
                <a
                  className="note-link"
                  href={publicPostHref(note.postSlug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the paper ↗
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
