import { useEffect, useMemo, useState } from "react";
import { presenceLine, type PresenceKeeper } from "../lib/presence";

type Props = {
  keepers: PresenceKeeper[];
};

export function PresenceIsland({ keepers }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState(0);

  const online = useMemo(() => keepers.filter((k) => k.online), [keepers]);
  const ordered = useMemo(() => {
    return [...keepers].sort((a, b) => Number(b.online) - Number(a.online));
  }, [keepers]);

  useEffect(() => {
    setFocus(0);
  }, [keepers.length]);

  useEffect(() => {
    if (expanded || ordered.length <= 1) return;
    const timer = window.setInterval(() => {
      setFocus((index) => (index + 1) % ordered.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [expanded, ordered.length]);

  if (ordered.length === 0) return null;

  const active = ordered[Math.min(focus, ordered.length - 1)]!;
  const summary =
    online.length > 0
      ? online.length === 1
        ? `${online[0]!.label} is online`
        : `${online.length} keepers online`
      : presenceLine(active);

  return (
    <div className="presence-island-wrap">
      <button
        type="button"
        className={`presence-island${expanded ? " is-expanded" : ""}${online.length > 0 ? " has-online" : ""}`}
        aria-expanded={expanded}
        aria-label="Keeper presence"
        onClick={() => setExpanded((open) => !open)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setExpanded(false);
          }
        }}
      >
        <span className="presence-island-pill" aria-live="polite">
          <span className={`presence-island-dot${online.length > 0 ? " is-online" : ""}`} aria-hidden="true" />
          {!expanded ? (
            <span className="presence-island-summary" key={summary}>
              {summary}
            </span>
          ) : (
            <span className="presence-island-list">
              {ordered.map((keeper) => (
                <span
                  key={keeper.email}
                  className={`presence-island-row${keeper.online ? " is-online" : ""}`}
                  title={keeper.email}
                >
                  <span className="presence-island-dot" aria-hidden="true" />
                  {presenceLine(keeper)}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
