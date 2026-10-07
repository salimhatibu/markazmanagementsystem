import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { eatDate, formatMoney } from "../../shared/format";
import { OcrUpload } from "../components/OcrUpload";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { bookFromOcr } from "../lib/ocr-fields";
import type { BookInventory } from "../types";

type DraftLine = { key: string; name: string; price: string };

function newLine(name = "", price = ""): DraftLine {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, price };
}

export function BooksPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const formRef = useRef<HTMLFormElement>(null);
  const [lists, setLists] = useState<BookInventory[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [purchasedOn, setPurchasedOn] = useState(eatDate);
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [stationeriesNote, setStationeriesNote] = useState("");
  const [stationeriesCost, setStationeriesCost] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  async function load() {
    const body = await api<{ inventories: BookInventory[] }>("/api/books");
    setLists(body.inventories);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The books list could not be opened."),
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lists;
    return lists.filter(
      (list) =>
        list.title.toLowerCase().includes(needle) ||
        list.items.some((item) => item.name.toLowerCase().includes(needle)) ||
        (list.stationeriesNote?.toLowerCase().includes(needle) ?? false),
    );
  }, [query, lists]);

  const liveTotal = useMemo(() => {
    let cents = 0;
    let ok = false;
    for (const line of lines) {
      const price = Number(line.price);
      if (line.name.trim() && Number.isFinite(price) && price > 0) {
        cents += Math.round(price * 100);
        ok = true;
      }
    }
    const stationery = Number(stationeriesCost);
    if (stationeriesNote.trim() && Number.isFinite(stationery) && stationery > 0) {
      cents += Math.round(stationery * 100);
      ok = true;
    }
    return ok ? cents / 100 : null;
  }, [lines, stationeriesNote, stationeriesCost]);

  const totalSpent = lists.reduce((sum, list) => sum + list.totalCost, 0);
  const totalTitles = lists.reduce((sum, list) => sum + list.items.length, 0);

  function setLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, newLine()]);
  }

  function removeLine(key: string) {
    setLines((current) => (current.length <= 1 ? current : current.filter((line) => line.key !== key)));
  }

  function resetForm() {
    setTitle("");
    setPurchasedOn(eatDate());
    setLines([newLine()]);
    setStationeriesNote("");
    setStationeriesCost("");
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const items = lines
        .map((line) => ({ name: line.name.trim(), price: line.price.trim() }))
        .filter((line) => line.name || line.price);
      if (items.length === 0) {
        throw new Error("Add at least one book to the list.");
      }
      for (const [index, item] of items.entries()) {
        if (!item.name) throw new Error(`Book ${index + 1} needs a name.`);
        if (!item.price) throw new Error(`Book ${index + 1} needs a price.`);
      }
      await api("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          purchasedOn,
          items,
          stationeriesNote: stationeriesNote.trim() || null,
          stationeriesCost: stationeriesCost.trim() || null,
        }),
      });
      resetForm();
      setOpen(false);
      setInfo("Book list saved. The total is also listed under Expenses.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The book list could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/books/${id}`, { method: "DELETE" });
      setRemoving(null);
      setInfo("That book list was removed and its expense was put back.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The book list could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="Office"
        title="Books"
        lead="Record a titled list of books bought together — add each title and price, watch the total grow, then save."
      >
        <button
          type="button"
          className="ghost"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close form" : "Add book list"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      {open ? (
        <form
          ref={formRef}
          id="book-inventory-form"
          className="expense-form"
          onSubmit={(event) => void create(event)}
        >
          <Panel tone="light">
            <p className="panel-title">New book inventory</p>
            <div className="form-grid">
              <Field id="book-list-title" label="List title" hint="Class or group name, e.g. Hadhaanah.">
                <input
                  id="book-list-title"
                  required
                  autoComplete="off"
                  placeholder="Hadhaanah"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field id="book-list-date" label="Date of purchase">
                <input
                  id="book-list-date"
                  type="date"
                  required
                  value={purchasedOn}
                  onChange={(event) => setPurchasedOn(event.target.value)}
                />
              </Field>
            </div>

            <div className="book-lines">
              <div className="book-lines-head">
                <span>Books in this purchase</span>
                <button type="button" className="text-button" onClick={addLine}>
                  Add book
                </button>
              </div>
              {lines.map((line, index) => (
                <div className={`book-line${index > 0 ? " book-line-compact" : ""}`} key={line.key}>
                  <Field id={`book-line-name-${line.key}`} label={index === 0 ? "Book name" : `Book ${index + 1}`}>
                    <input
                      id={`book-line-name-${line.key}`}
                      autoComplete="off"
                      placeholder="Qaaidah Nooraaniyyah"
                      value={line.name}
                      onChange={(event) => setLine(line.key, { name: event.target.value })}
                    />
                  </Field>
                  <Field id={`book-line-price-${line.key}`} label="Price">
                    <input
                      id={`book-line-price-${line.key}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={line.price}
                      onChange={(event) => setLine(line.key, { price: event.target.value })}
                    />
                  </Field>
                  <button
                    type="button"
                    className="text-button book-line-remove"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(line.key)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="form-grid book-stationeries">
              <Field
                id="book-stationeries-note"
                label="Stationeries (optional)"
                hint="Bundle description, e.g. Pencil, Rubber, Sharpener…"
              >
                <textarea
                  id="book-stationeries-note"
                  rows={2}
                  value={stationeriesNote}
                  onChange={(event) => setStationeriesNote(event.target.value)}
                  placeholder="Pencil, Rubber, Sharpener, Crayons, 4 exercise books…"
                />
              </Field>
              <Field id="book-stationeries-cost" label="Stationeries cost">
                <input
                  id="book-stationeries-cost"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={stationeriesCost}
                  onChange={(event) => setStationeriesCost(event.target.value)}
                />
              </Field>
            </div>

            {liveTotal != null ? (
              <p className="panel-note">
                Running total: <strong>{formatMoney(liveTotal, symbol)}</strong>
              </p>
            ) : (
              <p className="panel-note">Add books and prices to see the running total.</p>
            )}
            <button type="submit" className="solid" disabled={busy}>
              {busy ? "Saving…" : "Save list"}
            </button>
          </Panel>
        </form>
      ) : null}
      <Panel tone="light" className="ocr-panel">
        <OcrUpload
          kind="book"
          disabled={busy}
          onError={setError}
          onFields={(fields) => {
            const next = bookFromOcr(fields);
            const filled = next.items.filter((item) => item.name.trim()).length;
            setTitle(next.title);
            if (next.purchasedOn) setPurchasedOn(next.purchasedOn);
            setLines(next.items.map((item) => newLine(item.name, item.price)));
            setStationeriesNote(next.stationeriesNote);
            setStationeriesCost(next.stationeriesCost);
            setOpen(true);
            setError("");
            setInfo(
              filled > 0
                ? `Scan filled ${filled} ${filled === 1 ? "book" : "books"}${next.title ? ` for ${next.title}` : ""}. Check the form below, then save.`
                : "Scan finished, but no book lines were clear. Fill the form below by hand, or try a sharper photo.",
            );
            requestAnimationFrame(() => {
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              document.getElementById("book-list-title")?.focus();
            });
          }}
        />
      </Panel>
      <div className="toolbar">
        <Field id="book-search" label="Search">
          <input
            id="book-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a list or title"
          />
        </Field>
        <p className="count-label">
          {lists.length} {lists.length === 1 ? "list" : "lists"} · {totalTitles}{" "}
          {totalTitles === 1 ? "title" : "titles"} · {formatMoney(totalSpent, symbol)} spent
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening books…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {lists.length === 0
            ? "No book lists yet. Add a titled inventory when stock is bought for a class or group."
            : "No lists match that search."}
        </Empty>
      ) : (
        <div className="book-inventory-grid">
          {filtered.map((list) => (
            <article className="book-inventory-card" key={list.id}>
              <header className="book-inventory-card-head">
                <div>
                  <h2>{list.title}</h2>
                  <p>Purchased {list.purchasedOn}</p>
                </div>
                {removing === list.id ? (
                  <span className="inline-confirm">
                    Remove this list?
                    <button type="button" className="ghost" onClick={() => void remove(list.id)}>
                      Yes, remove
                    </button>
                    <button type="button" className="text-button" onClick={() => setRemoving(null)}>
                      Keep it
                    </button>
                  </span>
                ) : (
                  <button type="button" className="text-button" onClick={() => setRemoving(list.id)}>
                    Remove
                  </button>
                )}
              </header>
              <table className="book-inventory-table">
                <caption className="sr-only">{list.title} books and prices</caption>
                <tbody>
                  {list.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatMoney(item.price, symbol)}</td>
                    </tr>
                  ))}
                  <tr className="book-inventory-total">
                    <td>Total (books)</td>
                    <td>{formatMoney(list.booksTotal, symbol)}</td>
                  </tr>
                  {list.stationeriesNote && list.stationeriesCost != null ? (
                    <tr className="book-inventory-stationery">
                      <td>
                        <span className="book-inventory-stationery-label">Stationeries</span>
                        {list.stationeriesNote}
                      </td>
                      <td>{formatMoney(list.stationeriesCost, symbol)}</td>
                    </tr>
                  ) : null}
                  {list.stationeriesCost != null && list.stationeriesCost > 0 ? (
                    <tr className="book-inventory-total">
                      <td>Grand total</td>
                      <td>{formatMoney(list.totalCost, symbol)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
