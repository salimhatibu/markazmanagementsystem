import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GUIDE_STEPS, markGuideDone } from "../lib/guide";
import { CloseIcon } from "./Motifs";

type Hole = { top: number; left: number; width: number; height: number };

function findTarget(selector: string): HTMLElement | null {
  for (const part of selector.split(",")) {
    const el = document.querySelector(part.trim());
    if (el instanceof HTMLElement && el.getClientRects().length > 0) return el;
  }
  return null;
}

function measure(el: HTMLElement): Hole {
  const r = el.getBoundingClientRect();
  const pad = 10;
  return {
    top: Math.max(8, r.top - pad),
    left: Math.max(8, r.left - pad),
    width: Math.min(window.innerWidth - 16, r.width + pad * 2),
    height: Math.min(window.innerHeight * 0.4, r.height + pad * 2),
  };
}

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [hole, setHole] = useState<Hole | null>(null);
  const [cardBox, setCardBox] = useState({ top: 24, left: 16, side: "below" as "below" | "above" });
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

  useEffect(() => {
    if (!current) return;
    let tries = 0;
    let timer = 0;
    const ready = location.pathname === current.path;

    function locate(scroll: boolean) {
      const el = findTarget(current.target);
      if (!el) {
        if (tries < 20) {
          tries += 1;
          timer = window.setTimeout(() => locate(scroll), 80);
        } else {
          setHole(null);
        }
        return;
      }
      if (scroll) el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
      window.setTimeout(() => setHole(measure(el)), scroll ? 220 : 0);
    }

    if (ready) locate(true);
    function update() {
      const el = findTarget(current.target);
      if (el) setHole(measure(el));
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [current, location.pathname]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = card?.offsetWidth ?? Math.min(400, vw - 24);
    const cardH = card?.offsetHeight ?? 220;
    if (!hole) {
      setCardBox({ top: Math.max(16, vh - cardH - 20), left: Math.max(12, (vw - cardW) / 2), side: "below" });
      return;
    }
    const gap = 22;
    const below = hole.top + hole.height + gap;
    const above = hole.top - cardH - gap;
    const spaceBelow = vh - (hole.top + hole.height);
    const side: "below" | "above" = spaceBelow >= cardH + gap + 12 || spaceBelow >= hole.top ? "below" : "above";
    let top = side === "below" ? below : above;
    let left = hole.left + hole.width / 2 - cardW / 2;
    left = Math.max(12, Math.min(left, vw - cardW - 12));
    top = Math.max(12, Math.min(top, vh - cardH - 12));
    setCardBox({ top, left, side });
  }, [hole, step]);

  function finish() {
    markGuideDone();
    onClose();
  }

  function go(index: number) {
    const next = Math.max(0, Math.min(GUIDE_STEPS.length - 1, index));
    onStep(next);
  }

  if (!current) return null;

  const cardW = cardRef.current?.offsetWidth ?? 320;
  const cardH = cardRef.current?.offsetHeight ?? 200;
  const from = {
    x: cardBox.left + cardW / 2,
    y: cardBox.side === "below" ? cardBox.top : cardBox.top + cardH,
  };
  const to = hole
    ? {
        x: hole.left + hole.width / 2,
        y: cardBox.side === "below" ? hole.top + hole.height : hole.top,
      }
    : from;

  return (
    <div className="guide-layer">
      {hole ? (
        <div
          className="guide-hole"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : null}
      {hole ? (
        <svg className="guide-arrow" aria-hidden="true">
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
          <circle cx={to.x} cy={to.y} r="5" />
        </svg>
      ) : null}
      <div
        ref={cardRef}
        className="guide-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        style={{ top: cardBox.top, left: cardBox.left }}
      >
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
