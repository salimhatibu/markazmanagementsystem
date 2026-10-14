import { useEffect, useState } from "react";
import { READER_POLL_MS, beatReaderPresence, readingLine } from "../lib/reader-presence";

export function ReaderIsland() {
  const [reading, setReading] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancel = false;
    let timer: number | undefined;

    const beat = async () => {
      try {
        const next = await beatReaderPresence();
        if (!cancel) setReading(next);
      } catch {
        /* the papers read fine whether or not the tally lands */
      }
    };

    void beat();
    timer = window.setInterval(() => {
      void beat();
    }, READER_POLL_MS);

    // A backgrounded tab should stop counting, and catch up when it returns.
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancel = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (reading == null) return null;

  const others = Math.max(0, reading - 1);

  return (
    <div className="reader-island-wrap">
      <button
        type="button"
        className={`reader-island${expanded ? " is-expanded" : ""}`}
        aria-expanded={expanded}
        aria-label="Readers on the paper right now"
        onClick={() => setExpanded((open) => !open)}
        onBlur={() => setExpanded(false)}
      >
        <span className="reader-island-press" aria-hidden="true" />
        <span className="reader-island-body" aria-live="polite">
          {expanded ? (
            <span className="reader-island-long">{readingLine(reading)}</span>
          ) : (
            <>
              <strong className="reader-island-count">{reading}</strong>
              <span className="reader-island-label">reading now</span>
            </>
          )}
        </span>
        {!expanded && others > 0 ? (
          <span className="reader-island-rule" aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}
