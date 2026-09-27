import { useEffect, useRef, useState } from "react";
import {
  markSalamPlayed,
  SALAM_HIDDEN_TEXT,
  SALAM_START_TEXT,
  startSalamSand,
  type SalamHandle,
  type SalamPhase,
} from "../lib/sand-salam";
import { CloseIcon } from "./Motifs";

export function SalamSplash({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SalamHandle | null>(null);
  const leavingRef = useRef(false);
  const doneRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [phase, setPhase] = useState<SalamPhase>("hold");

  const showArabic = staticOnly || phase === "hold" || phase === "hiddenHold" || phase === "leave";
  const showEnglish = phase === "hiddenFadeIn" || phase === "reform" || phase === "hiddenHold" || phase === "leave";

  function notifyDone() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  function finish() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    handleRef.current?.stop();
    markSalamPlayed();
    setLeaving(true);
  }

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStaticOnly(true);
      const timer = window.setTimeout(finish, 1600);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const fonts = Promise.all([
      document.fonts?.ready,
      document.fonts?.load('700 72px "Amiri"'),
      document.fonts?.load('600 28px "Fraunces"'),
    ]).catch(() => undefined);

    Promise.resolve(fonts).then(() => {
      if (cancelled || !canvasRef.current) return;
      handleRef.current = startSalamSand(canvasRef.current, finish, setPhase);
    });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(notifyDone, 800);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div
      className={`salam-splash${leaving ? " leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Peace be upon you"
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && leaving) notifyDone();
      }}
    >
      {staticOnly ? null : <canvas ref={canvasRef} id="sandCanvas" />}
      <p
        className={`salam-live salam-arabic${showArabic ? " on" : ""}${staticOnly ? " salam-static" : ""}`}
        lang="ar"
        dir="rtl"
      >
        {SALAM_START_TEXT}
      </p>
      {staticOnly ? null : (
        <p className={`salam-live salam-english${showEnglish ? " on" : ""}`}>{SALAM_HIDDEN_TEXT}</p>
      )}
      <button type="button" className="salam-skip" aria-label="Enter the site" onClick={finish}>
        <CloseIcon />
      </button>
    </div>
  );
}
