import { FormEvent, useEffect, useState } from "react";
import { formatEat } from "../../shared/format";
import { api } from "../lib/api";
import type { FeedbackTicket } from "../types";

export function FeedbackDesk() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [kind, setKind] = useState<"query" | "suggestion">("query");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const response = await api<{ tickets: FeedbackTicket[] }>("/api/feedback");
    setTickets(response.tickets);
    setReady(true);
  }

  useEffect(() => {
    load().catch(() => {
      /* badge stays quiet until the panel is opened */
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "Tickets could not be opened."),
    );
  }, [open]);

  const openCount = tickets.filter((ticket) => !ticket.done).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api("/api/feedback", { method: "POST", body: JSON.stringify({ kind, body }) });
      setBody("");
      setKind("query");
      setInfo("Saved. It will stay on the list until someone marks it done.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That note could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setDone(ticket: FeedbackTicket, done: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/feedback/${ticket.id}`, {
        method: "PUT",
        body: JSON.stringify({ done }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That ticket could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(ticket: FeedbackTicket) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api(`/api/feedback/${ticket.id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That query could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`feedback-desk${open ? " is-open" : ""}`}>
      {open ? (
        <section className="feedback-panel" aria-label="Queries and suggestions">
          <header className="feedback-head">
            <div>
              <p className="feedback-kicker">Desk notes</p>
              <h2>Queries &amp; suggestions</h2>
            </div>
            <button type="button" className="feedback-close" aria-label="Close feedback" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <form className="feedback-compose" onSubmit={(event) => void submit(event)}>
            <label className="feedback-kind">
              <span className="sr-only">Kind</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as "query" | "suggestion")}>
                <option value="query">Query</option>
                <option value="suggestion">Suggestion</option>
              </select>
            </label>
            <textarea
              required
              maxLength={4000}
              rows={3}
              placeholder="Ask a question or leave a suggestion for the keepers…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <button type="submit" className="solid" disabled={busy || !body.trim()}>
              {busy ? "Saving…" : "Send note"}
            </button>
          </form>
          {error ? <p className="feedback-status is-error">{error}</p> : null}
          {info ? <p className="feedback-status">{info}</p> : null}
          <div className="feedback-list" role="list">
            {!ready ? <p className="feedback-empty">Opening tickets…</p> : null}
            {ready && tickets.length === 0 ? (
              <p className="feedback-empty">No notes yet. Write the first one above.</p>
            ) : null}
            {tickets.map((ticket) => (
              <article
                key={ticket.id}
                className={`feedback-ticket${ticket.done ? " is-done" : ""}`}
                role="listitem"
              >
                <div className="feedback-ticket-body">
                  <p className="feedback-meta">
                    <span>{ticket.kind === "suggestion" ? "Suggestion" : "Query"}</span>
                    <span>{formatEat(ticket.createdAt)}</span>
                  </p>
                  <p>{ticket.body}</p>
                  {ticket.done && ticket.doneAt ? (
                    <p className="feedback-done-note">Confirmed {formatEat(ticket.doneAt)}</p>
                  ) : null}
                </div>
                <div className="feedback-ticket-actions">
                  <button
                    type="button"
                    className="feedback-ticket-action is-done"
                    aria-label={ticket.done ? `Reopen ${ticket.kind}` : `Accept ${ticket.kind}`}
                    title={ticket.done ? "Reopen" : "Accept"}
                    disabled={busy}
                    onClick={() => void setDone(ticket, !ticket.done)}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="feedback-ticket-action is-cancel"
                    aria-label={`Cancel ${ticket.kind}`}
                    title="Cancel"
                    disabled={busy}
                    onClick={() => void cancel(ticket)}
                  >
                    ×
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        className="feedback-fab"
        aria-expanded={open}
        aria-label={open ? "Close feedback" : "Open queries and suggestions"}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "×" : "✎"}</span>
        {!open && openCount > 0 ? <span className="feedback-badge">{openCount}</span> : null}
      </button>
    </div>
  );
}
