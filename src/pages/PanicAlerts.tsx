import { useEffect, useState } from "react";
import { formatEat } from "../../shared/format";
import { api } from "../lib/api";
import { PANIC_LEVELS } from "../lib/panic";
import type { PanicAlert } from "../types";

const TIER = ["", "#58e5ff", "#7ddba4", "#f5c451", "#ff8a4c", "#ff3b47"];

function tierOf(level: number) {
  return TIER[level] ?? "#ff3b47";
}

function labelOf(level: number) {
  return PANIC_LEVELS.find((entry) => entry.level === level)?.label ?? "Unknown";
}

export function PanicAlertsPage() {
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The log reads as the emergency console itself, so the whole desk goes dark
  // while it is open and returns to normal on the way out.
  useEffect(() => {
    document.documentElement.dataset.panicLog = "on";
    return () => {
      delete document.documentElement.dataset.panicLog;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    api<{ alerts: PanicAlert[] }>("/api/panic-alerts")
      .then((body) => {
        if (!cancel) setAlerts(body.alerts);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "The log could not be opened.");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const critical = alerts.filter((alert) => alert.level >= 4).length;
  const latest = alerts[0];

  return (
    <div className="panic-log">
      <header className="panic-log-head">
        <p className="panic-log-kicker">Incident archive</p>
        <h1>Panic log</h1>
        <p className="panic-log-blurb">
          Every emergency raised from the panic button, newest first.
        </p>
        <dl className="panic-log-readout">
          <div>
            <dt>On record</dt>
            <dd>{loading ? "—" : alerts.length}</dd>
          </div>
          <div>
            <dt>Severe or above</dt>
            <dd className={critical > 0 ? "is-hot" : undefined}>{loading ? "—" : critical}</dd>
          </div>
          <div>
            <dt>Last entry</dt>
            <dd>{loading ? "—" : latest ? formatEat(latest.createdAt) : "None"}</dd>
          </div>
        </dl>
      </header>

      {loading ? (
        <p className="panic-log-state">Opening the log…</p>
      ) : error ? (
        <p className="panic-log-state is-error">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="panic-log-state">
          Nothing on record. Anything raised with the panic button lands here.
        </p>
      ) : (
        <ul className="panic-log-list">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="panic-log-row"
              style={{ ["--tier" as string]: tierOf(alert.level) }}
            >
              <div className="panic-log-row-head">
                <span className="panic-log-level">{alert.level}</span>
                <span className="panic-log-label">{labelOf(alert.level)}</span>
                <span className="panic-log-meter" aria-hidden="true">
                  {PANIC_LEVELS.map((bar) => (
                    <i key={bar.level} className={bar.level <= alert.level ? "on" : undefined} />
                  ))}
                </span>
                <span className="panic-log-meta">
                  <span className="panic-log-who">{alert.email}</span>
                  <time dateTime={alert.createdAt}>{formatEat(alert.createdAt)}</time>
                </span>
              </div>
              <p className="panic-log-note">{alert.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
