import { useEffect, useRef, useState } from "react";
import { markSalamPlayed, startSalamSand, type SalamHandle } from "../lib/sand-salam";
import { CloseIcon } from "./Motifs";

export function SalamSplash({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SalamHandle | null>(null);
  const leavingRef = useRef(false);
  const doneRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);

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
      document.fonts?.load('700 96px "Amiri"'),
      document.fonts?.load('700 96px "Scheherazade New"'),
    ]).catch(() => undefined);

    Promise.resolve(fonts).then(() => {
      if (cancelled || !canvasRef.current) return;
      handleRef.current = startSalamSand(canvasRef.current, finish);
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
      {staticOnly ? (
        <p className="salam-static" lang="ar" dir="rtl">
          السلام عليكم
        </p>
      ) : (
        <canvas ref={canvasRef} id="sandCanvas" />
      )}
      <button type="button" className="salam-skip" aria-label="Enter the site" onClick={finish}>
        <CloseIcon />
      </button>
    </div>
  );
}
