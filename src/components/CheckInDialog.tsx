import { useEffect, useRef } from "react";
import type { ComfortVerse } from "../lib/check-in";
import { CloseIcon } from "./Motifs";

export type CheckInView = "ask" | "yes" | "no";

export function CheckInDialog({
  view,
  verse,
  onYes,
  onNo,
  onClose,
}: {
  view: CheckInView;
  verse: ComfortVerse | null;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && view !== "ask") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  return (
    <div className="modal-veil check-in-veil">
      <div className="modal check-in-modal" role="dialog" aria-modal="true" aria-labelledby="check-in-title">
        {view !== "ask" ? (
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        ) : null}
        {view === "ask" ? (
          <>
            <p className="kicker">A quiet check</p>
            <h2 id="check-in-title">Are you okay?</h2>
            <div className="actions">
              <button ref={firstRef} type="button" className="solid" onClick={onYes}>
                Yes
              </button>
              <button type="button" className="ghost" onClick={onNo}>
                No
              </button>
            </div>
          </>
        ) : null}
        {view === "yes" ? (
          <>
            <p className="kicker">A quiet check</p>
            <h2 id="check-in-title">Alhamdulillah, keep at it!!!</h2>
            <div className="actions">
              <button ref={firstRef} type="button" className="solid" onClick={onClose}>
                Continue
              </button>
            </div>
          </>
        ) : null}
        {view === "no" && verse ? (
          <>
            <p className="kicker">{verse.ref}</p>
            <h2 id="check-in-title" className="arabic-line" lang="ar" dir="rtl">
              {verse.arabic}
            </h2>
            <p className="check-in-english">{verse.english}</p>
            <div className="actions">
              <button ref={firstRef} type="button" className="solid" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
