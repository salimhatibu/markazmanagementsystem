import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { api } from "../lib/api";

const KEY = "markaz_newsletter";
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function newsletterPromptDue(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "subscribed") return false;
    if (stored?.startsWith("later:")) {
      const at = Number(stored.slice(6));
      if (Number.isFinite(at) && Date.now() - at < WEEK) return false;
    }
  } catch {
    return false;
  }
  return true;
}

export function NewsletterPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    emailRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  function dismiss() {
    try {
      if (localStorage.getItem(KEY) !== "subscribed") {
        localStorage.setItem(KEY, `later:${Date.now()}`);
      }
    } catch {
      /* closing is enough for this visit */
    }
    onClose();
  }

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ already?: boolean }>("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      try {
        localStorage.setItem(KEY, "subscribed");
      } catch {
        /* the address is stored either way */
      }
      setDone(body.already ? "That address is already on the list." : "You are on the list.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That address could not be kept.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-letter" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) dismiss();
    }}>
      <div className="paper-letter-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <p className="paper-section-kicker">The letter</p>
        <h2 id={titleId}>A note when a new paper is posted.</h2>
        {done ? (
          <>
            <p>{done}</p>
            <button type="button" className="paper-rail-link" onClick={onClose}>
              Back to the paper
            </button>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <p>Leave an email if you want it. Nothing is sent for reading the paper itself.</p>
            <label>
              <span className="eyebrow">Email</span>
              <input
                ref={emailRef}
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {error ? <p className="status">{error}</p> : null}
            <div className="paper-letter-actions">
              <button type="submit" className="paper-letter-send" disabled={busy}>
                {busy ? "Saving…" : "Send me the letter"}
              </button>
              <button type="button" className="paper-letter-later" onClick={dismiss}>
                Not now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
