import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GUIDE_STEPS, markGuideDone } from "../lib/guide";
import { CloseIcon } from "./Motifs";

export function GuideTour({
  step,
  onStep,
  onClose,
}: {
  step: number;
  onStep: (index: number) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const nextRef = useRef<HTMLButtonElement>(null);
  const current = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;

  useEffect(() => {
    nextRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  useEffect(() => {
    if (current && location.pathname !== current.path) {
      navigate(current.path);
    }
  }, [current, location.pathname, navigate]);

  function finish() {
    markGuideDone();
    onClose();
  }

  function go(index: number) {
    const next = Math.max(0, Math.min(GUIDE_STEPS.length - 1, index));
    onStep(next);
  }

  if (!current) return null;

  return (
    <div className="guide-dock">
      <div className="guide-card" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <button type="button" className="modal-close" aria-label="Close the tutorial" onClick={finish}>
          <CloseIcon />
        </button>
        <p className="kicker">
          Step {step + 1} of {GUIDE_STEPS.length}
        </p>
        <h2 id="guide-title">{current.title}</h2>
        <p className="guide-body">{current.body}</p>
        <div className="guide-dots" aria-hidden="true">
          {GUIDE_STEPS.map((item, index) => (
            <span key={item.title} className={index === step ? "is-on" : index < step ? "is-done" : undefined} />
          ))}
        </div>
        <div className="guide-actions">
          <button type="button" className="text-button" onClick={finish}>
            Skip
          </button>
          {step > 0 ? (
            <button type="button" className="ghost" onClick={() => go(step - 1)}>
              Back
            </button>
          ) : null}
          <button
            ref={nextRef}
            type="button"
            className="solid"
            onClick={() => (last ? finish() : go(step + 1))}
          >
            {last ? "Start using the books" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
