import { useCallback, useEffect, useRef, useState } from "react";

export type CursorToastState = { id: number; message: string; x: number; y: number };

const LIFETIME_MS = 2200;
const MARGIN = 16;

/** Shows a short message anchored to wherever the triggering click happened. */
export function useCursorToast() {
  const [toast, setToast] = useState<CursorToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const idRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const showToast = useCallback((message: string, point: { clientX: number; clientY: number }) => {
    window.clearTimeout(timerRef.current);
    idRef.current += 1;
    const x = Math.min(point.clientX, window.innerWidth - 260 - MARGIN);
    const y = Math.min(Math.max(point.clientY, MARGIN), window.innerHeight - MARGIN);
    setToast({ id: idRef.current, message, x, y });
    timerRef.current = window.setTimeout(() => setToast(null), LIFETIME_MS);
  }, []);

  return { toast, showToast };
}
