import { FormEvent, useEffect, useState } from "react";
import { eatDate, formatMoney, formatShortDate } from "../../shared/format";
import { api } from "../lib/api";
import type { DailyExpenseDay } from "../types";
import { TrashIcon } from "./Motifs";
import { Empty, Field, Notice, Panel } from "./ui";

type Draft = { item: string; cost: string; details: string };

const blankRow = (): Draft => ({ item: "", cost: "", details: "" });

export function DailyExpenseDesk({ symbol, onSaved }: { symbol: string | null; onSaved?: () => void }) {
  const [days, setDays] = useState<DailyExpenseDay[]>([]);
  const [spentOn, setSpentOn] = useState(eatDate);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Draft[]>([blankRow()]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);

  async function load() {
    const body = await api<{ days: DailyExpenseDay[] }>("/api/daily-expenses");
    setDays(body.days);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The daily list could not be opened."),
    );
  }, []);

  // Blank rows are scaffolding for typing, so they never count toward the day.
  const filled = rows.filter((row) => row.item.trim() && row.cost.trim() !== "");
  const total = filled.reduce((sum, row) => {
    const value = Number(row.cost);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  function setRow(index: number, patch: Partial<Draft>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setInfo("");
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function dropRow(index: number) {
    setRows((current) => (current.length === 1 ? [blankRow()] : current.filter((_, i) => i !== index)));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (filled.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api("/api/daily-expenses", {
        method: "POST",
        body: JSON.stringify({
          spentOn,
          note: note.trim() || undefined,
          items: filled.map((row) => ({
            item: row.item.trim(),
            cost: row.cost.trim(),
            details: row.details.trim() || undefined,
          })),
        }),
      });
      setRows([blankRow()]);
      setNote("");
      await load();
      onSaved?.();
      setInfo(`That day was saved as one expense of ${formatMoney(total, symbol)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That day could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setError("");
    setInfo("");
    try {
      await api(`/api/daily-expenses/${id}`, { method: "DELETE" });
      await load();
      onSaved?.();
      setRemoving(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That day could not be removed.");
    }
  }

  return (
    <>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}

      <form onSubmit={(event) => void save(event)}>
        <Panel tone="light" className="daily-form">
          <p className="panel-title">A day&rsquo;s spending</p>
          <p className="daily-lead">
            Put down each thing bought on the day. The total adds itself, and the whole day is kept as a
            single expense.
          </p>

          <div className="form-grid daily-head">
            <Field id="daily-date" label="Day">
              <input
                id="daily-date"
                type="date"
                required
                value={spentOn}
                onChange={(event) => setSpentOn(event.target.value)}
              />
            </Field>
            <Field id="daily-note" label="Note for the day (optional)">
              <input
                id="daily-note"
                placeholder="Market run for the kitchen…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>

          <div className="table-wrap daily-rows">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Cost</th>
                  <th>Other details</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td data-label="Item">
                      <input
                        aria-label={`Item ${index + 1}`}
                        placeholder="Rice, charcoal, nails…"
                        value={row.item}
                        onChange={(event) => setRow(index, { item: event.target.value })}
                      />
                    </td>
                    <td data-label="Cost">
                      <input
                        aria-label={`Cost of item ${index + 1}`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={row.cost}
                        onChange={(event) => setRow(index, { cost: event.target.value })}
                      />
                    </td>
                    <td data-label="Other details">
                      <input
                        aria-label={`Details for item ${index + 1}`}
                        placeholder="Where it came from, quantity…"
                        value={row.details}
                        onChange={(event) => setRow(index, { details: event.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="daily-drop"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => dropRow(index)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="daily-actions">
            <button type="button" className="ghost" onClick={addRow}>
              Add another item
            </button>
            <p className="daily-total">
              <span>Total for the day</span>
              <strong>{formatMoney(total, symbol)}</strong>
            </p>
            <button type="submit" className="solid" disabled={filled.length === 0 || busy}>
              {busy ? "Saving…" : "Save the day"}
            </button>
          </div>
        </Panel>
      </form>

      <Panel tone="light">
        <p className="panel-title">Days already recorded</p>
        {!ready ? <p className="loading-line">Opening the daily book…</p> : null}
        {ready && days.length === 0 ? <Empty>No days recorded yet.</Empty> : null}
        {days.length > 0 ? (
          <ul className="daily-list">
            {days.map((day) => (
              <li key={day.id} className="daily-day">
                <button
                  type="button"
                  className="daily-day-head"
                  aria-expanded={openDay === day.id}
                  onClick={() => setOpenDay((current) => (current === day.id ? null : day.id))}
                >
                  <span className="daily-day-date">{formatShortDate(day.spentOn)}</span>
                  <span className="daily-day-count">
                    {day.items.length} {day.items.length === 1 ? "item" : "items"}
                  </span>
                  {day.note ? <span className="daily-day-note">{day.note}</span> : null}
                  <strong className="daily-day-total">{formatMoney(day.total, symbol)}</strong>
                </button>
                {openDay === day.id ? (
                  <div className="daily-day-body">
                    <ul className="daily-day-items">
                      {day.items.map((item) => (
                        <li key={item.id}>
                          <span className="daily-item-name">{item.item}</span>
                          {item.details ? <span className="daily-item-detail">{item.details}</span> : null}
                          <span className="daily-item-cost">{formatMoney(item.cost, symbol)}</span>
                        </li>
                      ))}
                    </ul>
                    {removing === day.id ? (
                      <div className="daily-confirm">
                        <span>Remove this day and its expense?</span>
                        <button type="button" className="ghost" onClick={() => void remove(day.id)}>
                          Remove it
                        </button>
                        <button type="button" className="text-button" onClick={() => setRemoving(null)}>
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="text-button" onClick={() => setRemoving(day.id)}>
                        Remove this day
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </>
  );
}
