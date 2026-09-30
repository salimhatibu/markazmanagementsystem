import { useEffect, useState } from "react";
import { commitNextCheckIn, nextComfortVerse, peekCheckInDelay, type ComfortVerse } from "../lib/check-in";
import { CheckInDialog, type CheckInView } from "./CheckInDialog";

export function CheckInLayer() {
  const [view, setView] = useState<CheckInView | null>(null);
  const [verse, setVerse] = useState<ComfortVerse | null>(null);

  useEffect(() => {
    if (view) return;
    const wait = window.setTimeout(() => setView("ask"), peekCheckInDelay());
    return () => window.clearTimeout(wait);
  }, [view]);

  if (!view) return null;

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
