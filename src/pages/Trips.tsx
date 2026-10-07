import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { formatMoney } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { TripSummary } from "../types";

export function TripsPage() {
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const body = await api<{ trips: TripSummary[] }>("/api/trips");
    setTrips(body.trips);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The trips list could not be opened."),
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return trips;
    return trips.filter(
      (trip) => trip.title.toLowerCase().includes(needle) || (trip.notes ?? "").toLowerCase().includes(needle),
    );
  }, [query, trips]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ trip: TripSummary }>("/api/trips", {
        method: "POST",
        body: JSON.stringify({ title, notes: notes.trim() || null }),
      });
      navigate(`/trips/${body.trip.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The trip could not be saved.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="Miscellaneous"
        title="Trips"
        lead="Keep a ledger for each trip or transport fund — money in, things bought, and the running total."
      >
        <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close form" : "New trip ledger"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}

      {open ? (
        <Panel tone="light">
          <p className="panel-title">Start a trip ledger</p>
          <form className="form-grid" onSubmit={(event) => void create(event)}>
            <Field id="trip-title" label="Title">
              <input
                id="trip-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Trip 2026, Transport Money…"
              />
            </Field>
            <Field id="trip-notes" label="Notes (optional)">
              <input
                id="trip-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything the office should remember"
              />
            </Field>
            <button type="submit" className="solid" disabled={busy}>
              {busy ? "Saving…" : "Open ledger"}
            </button>
          </form>
        </Panel>
      ) : null}

      <div className="toolbar">
        <Field id="trip-search" label="Find a trip">
          <input
            id="trip-search"
            className="search"
            type="search"
            autoComplete="off"
            placeholder="Title or notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="count-label">
          {filtered.length} {filtered.length === 1 ? "ledger" : "ledgers"}
        </p>
      </div>

      {!ready && !error ? (
        <p className="loading-line">Opening trips…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {trips.length === 0
            ? "No trip ledgers yet. Start one for a class outing, transport money, or bazaar profit."
            : "Nothing matches that search."}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="table-caption">Trip ledgers</caption>
            <thead>
              <tr>
                <th>Title</th>
                <th>Lines</th>
                <th>Received</th>
                <th>Spent</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trip) => (
                <tr key={trip.id}>
                  <td data-label="Title">{trip.title}</td>
                  <td data-label="Lines">{trip.entryCount}</td>
                  <td data-label="Received">{formatMoney(trip.received, symbol)}</td>
                  <td data-label="Spent">{formatMoney(trip.spent, symbol)}</td>
                  <td data-label="Balance">{formatMoney(trip.balance, symbol)}</td>
                  <td>
                    <Link className="row-link" to={`/trips/${trip.id}`}>
                      Open ledger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
