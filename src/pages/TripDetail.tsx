import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { eatDate, formatMoney, formatShortDate } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { TripDetail, TripEntry, TripEntryKind } from "../types";

type EntryDraft = {
  description: string;
  quantity: string;
  amount: string;
  kind: TripEntryKind;
  entryOn: string;
  notes: string;
};

function emptyDraft(): EntryDraft {
  return {
    description: "",
    quantity: "",
    amount: "",
    kind: "in",
    entryOn: eatDate(),
    notes: "",
  };
}

function draftFromEntry(entry: TripEntry): EntryDraft {
  return {
    description: entry.description,
    quantity: entry.quantity ?? "",
    amount: String(entry.amount),
    kind: entry.kind,
    entryOn: entry.entryOn,
    notes: entry.notes ?? "",
  };
}

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmDeleteTrip, setConfirmDeleteTrip] = useState(false);
  const [filter, setFilter] = useState<"all" | TripEntryKind>("all");

  async function load() {
    const body = await api<{ trip: TripDetail }>(`/api/trips/${id}`);
    setTrip(body.trip);
    setTitle(body.trip.title);
    setNotes(body.trip.notes ?? "");
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "This trip ledger could not be opened."),
    );
  }, [id]);

  const visible = useMemo(() => {
    if (!trip) return [];
    if (filter === "all") return trip.entries;
    return trip.entries.filter((entry) => entry.kind === filter);
  }, [trip, filter]);

  const yearGroups = useMemo(() => {
    const groups = new Map<string, TripEntry[]>();
    for (const entry of visible) {
      const year = entry.entryOn.slice(0, 4) || "Undated";
      const list = groups.get(year) ?? [];
      list.push(entry);
      groups.set(year, list);
    }
    return [...groups.entries()];
  }, [visible]);

  async function saveTrip(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ trip: TripDetail }>(`/api/trips/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, notes: notes.trim() || null }),
      });
      setTrip(body.trip);
      setEditingTitle(false);
      setInfo("Ledger details saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The ledger could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const payload = {
        description: draft.description,
        quantity: draft.quantity.trim() || null,
        amount: draft.amount,
        kind: draft.kind,
        entryOn: draft.entryOn,
        notes: draft.notes.trim() || null,
      };
      const body =
        editingId == null
          ? await api<{ trip: TripDetail }>(`/api/trips/${id}/entries`, {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await api<{ trip: TripDetail }>(`/api/trip-entries/${editingId}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });
      setTrip(body.trip);
      setDraft(emptyDraft());
      setEditingId(null);
      setInfo(editingId == null ? "Line added to the ledger." : "Line updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That line could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entryId: number) {
    setBusy(true);
    setError("");
    try {
      const body = await api<{ trip: TripDetail }>(`/api/trip-entries/${entryId}`, { method: "DELETE" });
      setTrip(body.trip);
      setRemovingId(null);
      if (editingId === entryId) {
        setEditingId(null);
        setDraft(emptyDraft());
      }
      setInfo("That line was removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That line could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTrip() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/trips/${id}`, { method: "DELETE" });
      navigate("/trips");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The ledger could not be removed.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!trip) {
    return error ? <Notice>{error}</Notice> : <p className="loading-line">Opening this ledger…</p>;
  }

  return (
    <>
      <PageHeader kicker="Trips" title={trip.title} person>
        <Link className="ghost" to="/trips">
          Back to trips
        </Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}

      <div className="meta-row">
        <div>
          <span className="kicker">Received</span>
          <strong>{formatMoney(trip.received, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Spent</span>
          <strong>{formatMoney(trip.spent, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Balance</span>
          <strong>{formatMoney(trip.balance, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Lines</span>
          <strong>{trip.entryCount}</strong>
        </div>
      </div>

      <Panel tone="light">
        {editingTitle ? (
          <form className="form-grid" onSubmit={(event) => void saveTrip(event)}>
            <p className="panel-title">Ledger details</p>
            <Field id="edit-trip-title" label="Title">
              <input
                id="edit-trip-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field id="edit-trip-notes" label="Notes (optional)">
              <textarea
                id="edit-trip-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <div className="actions">
              <button type="submit" className="solid" disabled={busy}>
                Save details
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  setEditingTitle(false);
                  setTitle(trip.title);
                  setNotes(trip.notes ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="panel-title">Ledger details</p>
            <p>{trip.notes || "No notes on this ledger."}</p>
            <button type="button" className="ghost" disabled={busy} onClick={() => setEditingTitle(true)}>
              Edit title or notes
            </button>
          </>
        )}
      </Panel>

      <Panel tone="dark">
        <p className="panel-title">{editingId == null ? "Add a line" : "Edit line"}</p>
        <p>
          Record money received (profit, donations, canteen) or money spent (bus, food, fare). The balance updates as
          you go.
        </p>
        <form className="form-grid" onSubmit={(event) => void saveEntry(event)}>
          <Field id="entry-kind" label="Kind">
            <select
              id="entry-kind"
              value={draft.kind}
              onChange={(event) => setDraft({ ...draft, kind: event.target.value as TripEntryKind })}
            >
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
          </Field>
          <Field id="entry-description" label="Description">
            <input
              id="entry-description"
              required
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Profit received, Bus, Canteen profit…"
            />
          </Field>
          <Field id="entry-quantity" label="Quantity / unit (optional)">
            <input
              id="entry-quantity"
              value={draft.quantity}
              onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
              placeholder="4, 1/2 kg, 20 litres…"
            />
          </Field>
          <Field id="entry-amount" label="Amount">
            <input
              id="entry-amount"
              inputMode="decimal"
              required
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              placeholder="0.00"
            />
          </Field>
          <Field id="entry-date" label="Date">
            <input
              id="entry-date"
              type="date"
              required
              value={draft.entryOn}
              onChange={(event) => setDraft({ ...draft, entryOn: event.target.value })}
            />
          </Field>
          <Field id="entry-notes" label="Notes (optional)">
            <input
              id="entry-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="Um Maalik, used on pizza…"
            />
          </Field>
          <div className="actions">
            <button type="submit" className="solid" disabled={busy}>
              {busy ? "Saving…" : editingId == null ? "Add line" : "Save changes"}
            </button>
            {editingId != null ? (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft());
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <div className="toolbar">
        <Field id="entry-filter" label="Show">
          <select
            id="entry-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as "all" | TripEntryKind)}
          >
            <option value="all">All lines</option>
            <option value="in">Money in only</option>
            <option value="out">Money out only</option>
          </select>
        </Field>
        <p className="count-label">
          Total money {formatMoney(trip.balance, symbol)}
        </p>
      </div>

      {visible.length === 0 ? (
        <Empty>No lines on this view yet. Add profit, donations, or things bought above.</Empty>
      ) : (
        yearGroups.map(([year, rows]) => {
          const yearReceived = rows.filter((row) => row.kind === "in").reduce((sum, row) => sum + row.amount, 0);
          const yearSpent = rows.filter((row) => row.kind === "out").reduce((sum, row) => sum + row.amount, 0);
          return (
            <Panel key={year} tone="light" className="trip-year-panel">
              <p className="panel-title">{year}</p>
              <div className="table-wrap">
                <table>
                  <caption className="table-caption">
                    {year}: in {formatMoney(yearReceived, symbol)} · out {formatMoney(yearSpent, symbol)} · net{" "}
                    {formatMoney(yearReceived - yearSpent, symbol)}
                  </caption>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Kind</th>
                      <th>Amount</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="Date">{formatShortDate(entry.entryOn)}</td>
                        <td data-label="Description">{entry.description}</td>
                        <td data-label="Qty">{entry.quantity || "—"}</td>
                        <td data-label="Kind">{entry.kind === "in" ? "In" : "Out"}</td>
                        <td data-label="Amount">{formatMoney(entry.amount, symbol)}</td>
                        <td data-label="Notes">{entry.notes || "—"}</td>
                        <td>
                          {removingId === entry.id ? (
                            <span className="inline-confirm">
                              Remove?
                              <button type="button" className="ghost" onClick={() => void removeEntry(entry.id)}>
                                Yes
                              </button>
                              <button type="button" className="text-button" onClick={() => setRemovingId(null)}>
                                Keep
                              </button>
                            </span>
                          ) : (
                            <span className="row-actions">
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => {
                                  setEditingId(entry.id);
                                  setDraft(draftFromEntry(entry));
                                  setInfo("");
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => setRemovingId(entry.id)}
                              >
                                Remove
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })
      )}

      <div className="actions">
        {confirmDeleteTrip ? (
          <div className="confirm-box" role="group" aria-label="Confirm ledger deletion">
            <p>This permanently deletes {trip.title} and every line on it.</p>
            <button type="button" className="solid" disabled={busy} onClick={() => void removeTrip()}>
              Yes, delete ledger
            </button>
            <button type="button" className="ghost" onClick={() => setConfirmDeleteTrip(false)}>
              Keep ledger
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirmDeleteTrip(true)}>
            Delete this ledger
          </button>
        )}
      </div>
    </>
  );
}
