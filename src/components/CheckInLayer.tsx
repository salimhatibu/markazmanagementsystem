import { useEffect, useState } from "react";
import { commitNextCheckIn, nextComfortVerse, peekCheckInDelay, type ComfortVerse } from "../lib/check-in";
import { CheckInDialog, type CheckInView } from "./CheckInDialog";

export function CheckInLayer({ paused = false }: { paused?: boolean }) {
  const [view, setView] = useState<CheckInView | null>(null);
  const [verse, setVerse] = useState<ComfortVerse | null>(null);

  useEffect(() => {
    if (paused || view) return;
    const wait = window.setTimeout(() => setView("ask"), peekCheckInDelay());
    return () => window.clearTimeout(wait);
  }, [paused, view]);

  if (!view || paused) return null;

  return (
    <CheckInDialog
      view={view}
      verse={verse}
      onYes={() => setView("yes")}
      onNo={() => {
        setVerse(nextComfortVerse());
        setView("no");
      }}
      onClose={() => {
        commitNextCheckIn();
        setView(null);
        setVerse(null);
      }}
    />
  );
}
