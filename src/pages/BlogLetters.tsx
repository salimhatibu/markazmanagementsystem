import { FormEvent, useEffect, useState } from "react";
import { formatEat } from "../../shared/format";
import { api } from "../lib/api";

type Subscriber = { id: number; email: string; createdAt: string };

type Letter = {
  id: number;
  subject: string;
  body: string;
  author: string | null;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
};

export function BlogLettersPage() {
  const [people, setPeople] = useState<Subscriber[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [mailReady, setMailReady] = useState<boolean | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [openLetter, setOpenLetter] = useState<number | null>(null);

  async function load() {
    const [subs, mail] = await Promise.all([
      api<{ subscribers: Subscriber[] }>("/api/newsletter"),
      api<{ letters: Letter[]; mailReady: boolean }>("/api/newsletter/letters"),
    ]);
    setPeople(subs.subscribers);
    setLetters(mail.letters);
    setMailReady(mail.mailReady);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The letters could not be opened."),
    );
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !body.trim() || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ sent: boolean; sentCount?: number; waiting?: number }>(
        "/api/newsletter/letters",
        { method: "POST", body: JSON.stringify({ subject: subject.trim(), body: body.trim() }) },
      );
      setSubject("");
      setBody("");
      await load();
      setNotice(
        result.sent
          ? `Sent to ${result.sentCount} ${result.sentCount === 1 ? "reader" : "readers"}.`
          : `Kept. It will go to ${result.waiting} ${result.waiting === 1 ? "reader" : "readers"} once the mailbox is connected.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That letter could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const since = (iso: string) => formatEat(iso).replace(" EAT", "");

  return (
    <>
      <section className="choices-header">
        <div>
          <span className="eyebrow">The mailing list</span>
          <h2>Letters</h2>
        </div>
        <p>
          Everyone who left an email, and the letters written out to them. A letter is kept whether or not the
          mailbox is connected.
        </p>
      </section>

      {error ? <p className="note-state is-error">{error}</p> : null}
      {notice ? <p className="letters-notice">{notice}</p> : null}

      {ready && mailReady === false ? (
        <p className="letters-mailbox">
          The office mailbox is not connected yet, so letters are written and kept but not posted. Everything else
          here works.
        </p>
      ) : null}

      <div className="letters-grid">
        <section className="letters-compose">
          <h3 className="letters-head">Write to the readers</h3>
          <form onSubmit={(event) => void send(event)}>
            <label className="letters-label" htmlFor="letter-subject">
              Subject
            </label>
            <input
              id="letter-subject"
              maxLength={200}
              required
              placeholder="A new paper on patience"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            <label className="letters-label" htmlFor="letter-body">
              The letter
            </label>
            <textarea
              id="letter-body"
              rows={10}
              maxLength={8000}
              required
              placeholder="Write plainly. A line about what was posted, and why it may be worth their time."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="letters-actions">
              <span className="letters-count">
                {people.length} {people.length === 1 ? "address" : "addresses"} on the list
              </span>
              <button
                type="submit"
                className="solid"
                disabled={!subject.trim() || !body.trim() || busy || people.length === 0}
              >
                {busy ? "Sending…" : "Send the letter"}
              </button>
            </div>
          </form>
        </section>

        <aside className="letters-people">
          <h3 className="letters-head">On the list</h3>
          {!ready ? <p className="note-state">Opening…</p> : null}
          {ready && people.length === 0 ? (
            <p className="note-state">No one has left an email yet.</p>
          ) : null}
          {people.length > 0 ? (
            <ul className="letters-list">
              {people.map((person) => (
                <li key={person.id}>
                  <span className="letters-email">{person.email}</span>
                  <time dateTime={person.createdAt}>{since(person.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>

      <section className="letters-sent">
        <h3 className="letters-head">Letters already written</h3>
        {ready && letters.length === 0 ? <p className="note-state">None yet.</p> : null}
        {letters.length > 0 ? (
          <ul className="letters-archive">
            {letters.map((letter) => (
              <li key={letter.id} className={letter.sentAt ? "letter-row" : "letter-row is-held"}>
                <button
                  type="button"
                  aria-expanded={openLetter === letter.id}
                  onClick={() => setOpenLetter((cur) => (cur === letter.id ? null : letter.id))}
                >
                  <span className="letter-subject">{letter.subject}</span>
                  <span className="letter-meta">
                    {letter.sentAt
                      ? `Sent to ${letter.sentCount}${letter.failedCount ? ` · ${letter.failedCount} failed` : ""}`
                      : "Held — mailbox not connected"}
                  </span>
                  <time dateTime={letter.createdAt}>{since(letter.createdAt)}</time>
                </button>
                {openLetter === letter.id ? <p className="letter-body">{letter.body}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </>
  );
}
