import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { presenceLine, type PresenceKeeper } from "../lib/presence";

type Props = {
  keepers: PresenceKeeper[];
};

export function PresenceIsland({ keepers }: Props) {
  const auth = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState(0);

  const others = useMemo(() => {
    const self = auth.user?.email?.trim().toLowerCase();
    if (!self) return keepers;
    return keepers.filter((keeper) => keeper.email.toLowerCase() !== self);
  }, [keepers, auth.user?.email]);

  const ordered = useMemo(() => {
    return [...others].sort((a, b) => Number(b.online) - Number(a.online));
  }, [others]);

  useEffect(() => {
    setFocus(0);
  }, [others.length]);

  useEffect(() => {
    if (expanded || ordered.length <= 1) return;
    const timer = window.setInterval(() => {
      setFocus((index) => (index + 1) % ordered.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [expanded, ordered.length]);

  if (ordered.length === 0) return null;

  const active = ordered[Math.min(focus, ordered.length - 1)]!;
  const summary = active.online ? `${active.label} is online` : presenceLine(active);

  return (
    <div className="presence-island-wrap">
      <button
        type="button"
        className={`presence-island${expanded ? " is-expanded" : ""}${active.online ? " has-online" : ""}`}
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
          {!expanded ? (
            <>
              <span className={`presence-island-dot${active.online ? " is-online" : ""}`} aria-hidden="true" />
              <span className="presence-island-summary" key={summary}>
                {summary}
              </span>
            </>
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
