import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEat } from "../../shared/format";
import { api } from "../lib/api";
import type { DeskNotification } from "../types";
import { BellIcon } from "./Motifs";

/** Where a notification sends you when it is opened. */
function destinationFor(note: DeskNotification): string | null {
  if (note.kind === "comment") return "/blog/notes";
  if (note.kind === "report") return "/reports";
  // A notice is the whole message; there is nowhere further to go.
  return null;
}

function labelFor(kind: DeskNotification["kind"]): string {
  if (kind === "comment") return "Note";
  if (kind === "notice") return "Desk";
  return "Report";
}

export function NotificationBell({
  unread,
  onRead,
}: {
  unread: number;
  onRead: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<DeskNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const body = await api<{ notifications: DeskNotification[] }>("/api/notifications");
      setNotes(body.notifications);
      // Opening the bar is reading it, so the count clears for both kinds.
      if (body.notifications.some((note) => note.readAt == null)) {
        await api("/api/notifications/read", { method: "POST" });
        await onRead();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notifications could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  function go(note: DeskNotification) {
    const to = destinationFor(note);
    if (!to) return;
    setOpen(false);
    navigate(to);
  }

  return (
    <div className="bell-wrap" ref={rootRef}>
      <button
        type="button"
        className={`bell${open ? " is-open" : ""}${unread > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-controls="notification-bar"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => void toggle()}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="bell-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="bell-bar" id="notification-bar" role="region" aria-label="Notifications">
          <p className="bell-bar-title">Notifications</p>
          {loading ? <p className="bell-bar-state">Opening…</p> : null}
          {error ? <p className="bell-bar-state is-error">{error}</p> : null}
          {!loading && !error && notes.length === 0 ? (
            <p className="bell-bar-state">Nothing yet. Reports and readers&rsquo; notes arrive here.</p>
          ) : null}
          {notes.length > 0 ? (
            <ul className="bell-list">
              {notes.slice(0, 20).map((note) => (
                <li key={note.id} className={note.readAt == null ? "bell-row is-new" : "bell-row"}>
                  <button
                    type="button"
                    onClick={() => go(note)}
                    className={destinationFor(note) ? undefined : "is-static"}
                  >
                    <span className={`bell-kind is-${note.kind}`}>{labelFor(note.kind)}</span>
                    <span className="bell-row-title">{note.title}</span>
                    {note.body ? <span className="bell-row-body">{note.body}</span> : null}
                    <time dateTime={note.createdAt}>{formatEat(note.createdAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
