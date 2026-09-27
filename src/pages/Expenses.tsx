import { FormEvent, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { eatDate, formatMoney } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { Expense } from "../types";

const REASONS = ["Maintenance", "Books", "Food", "Transport", "Utilities", "Other"];

export function ExpensesPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const [items, setItems] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Maintenance");
  const [customReason, setCustomReason] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [spentOn, setSpentOn] = useState(eatDate);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  async function load() {
    const body = await api<{ expenses: Expense[] }>("/api/expenses");
    setItems(body.expenses);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The expense list could not be opened."),
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.reason.toLowerCase().includes(needle) || (item.details ?? "").toLowerCase().includes(needle),
    );
  }, [query, items]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const label = reason === "Other" ? customReason : reason;
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ reason: label, amount, details, spentOn }),
      });
      setAmount("");
      setCustomReason("");
      setDetails("");
      setSpentOn(eatDate());
      setOpen(false);
      setInfo("Expense recorded. It is taken from the funds in the office.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The expense could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/expenses/${id}`, { method: "DELETE" });
      setRemoving(null);
      setInfo("That expense was removed and the office total was put back.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The expense could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="Office"
        title="Expenses"
        lead="Books, repairs, and other office costs come out of the funds held at the markaz."
      >
        <button
          type="button"
          className="ghost"
          data-guide="add-expense"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close form" : "Add an expense"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      {open ? (
        <form className="expense-form" onSubmit={(event) => void create(event)}>
          <Panel tone="light">
            <p className="panel-title">New expense</p>
            <div className="form-grid">
              <Field id="expense-reason" label="Reason">
                <select id="expense-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
                  {REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              {reason === "Other" ? (
                <Field id="expense-custom" label="Describe the reason">
                  <input
                    id="expense-custom"
                    required
                    placeholder="Whitewash, extra Qurans…"
                    value={customReason}
                    onChange={(event) => setCustomReason(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field id="expense-amount" label="Amount" hint="Kenyan shillings, taken from funds in the office.">
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field id="expense-date" label="Date spent">
                <input
                  id="expense-date"
                  type="date"
                  required
                  value={spentOn}
                  onChange={(event) => setSpentOn(event.target.value)}
                />
              </Field>
            </div>
          </Panel>
          <Panel tone="light">
            <p className="panel-title">Details</p>
            <div className="expense-details">
              <Field
                id="expense-details"
                label="What was bought or done"
                hint="Optional. Supplier, room, invoice number, or anything else the office should remember."
              >
                <textarea
                  id="expense-details"
                  rows={4}
                  maxLength={2000}
                  placeholder="New Qurans for the evening class, paid in cash…"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </Field>
            </div>
            <button className="solid" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save expense"}
            </button>
          </Panel>
        </form>
      ) : null}
      <div className="toolbar">
        <Field id="expense-search" label="Find an expense">
          <input
            id="expense-search"
            className="search"
            type="search"
            autoComplete="off"
            placeholder="Maintenance, books…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="count-label">
          {filtered.length} {filtered.length === 1 ? "expense" : "expenses"} · {formatMoney(total, symbol)} spent
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening expenses…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {items.length === 0
            ? "No expenses yet. Add one when something is paid from the office funds."
            : "Nothing matches that search."}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="table-caption">Office expenses</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td data-label="Date">{item.spentOn}</td>
                  <td data-label="Reason">{item.reason}</td>
                  <td data-label="Details">{item.details || "—"}</td>
                  <td data-label="Amount">{formatMoney(item.amount, symbol)}</td>
                  <td>
                    {removing === item.id ? (
                      <span className="inline-confirm">
                        Remove this expense?
                        <button type="button" className="ghost" onClick={() => void remove(item.id)}>
                          Yes, remove
                        </button>
                        <button type="button" className="text-button" onClick={() => setRemoving(null)}>
                          Keep it
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="text-button" onClick={() => setRemoving(item.id)}>
                        Remove
                      </button>
                    )}
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
