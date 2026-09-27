import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { eatDate, formatMoney, label } from "../../shared/format";
import { TeacherForm } from "../components/TeacherForm";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { teacherToInput, type Teacher, type TeacherInput } from "../types";

function today() {
  return eatDate();
}

export function TeacherDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [draft, setDraft] = useState<TeacherInput | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removingPayment, setRemovingPayment] = useState<number | null>(null);

  async function load() {
    const body = await api<{ teacher: Teacher }>(`/api/teachers/${id}`);
    setTeacher(body.teacher);
    setDraft(teacherToInput(body.teacher));
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "This teacher record could not be opened."),
    );
  }, [id]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const body = await api<{ teacher: Teacher }>(`/api/teachers/${id}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setTeacher(body.teacher);
      setDraft(teacherToInput(body.teacher));
      setInfo("Saved. The details are up to date.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The teacher could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ teacher: Teacher }>(`/api/teachers/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, paidOn, note }),
      });
      setTeacher(body.teacher);
      setDraft(teacherToInput(body.teacher));
      setAmount("");
      setNote("");
      setInfo("Salary payment recorded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(paymentId: number) {
    setBusy(true);
    try {
      const body = await api<{ teacher: Teacher }>(`/api/salary-payments/${paymentId}`, { method: "DELETE" });
      setTeacher(body.teacher);
      setDraft(teacherToInput(body.teacher));
      setRemovingPayment(null);
      setInfo("That payment was removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTeacher() {
    setBusy(true);
    try {
      await api(`/api/teachers/${id}`, { method: "DELETE" });
      navigate("/teachers");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The teacher could not be deleted.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!teacher || !draft) {
    return error ? <Notice>{error}</Notice> : <p className="loading-line">Opening this record…</p>;
  }

  return (
    <>
      <PageHeader kicker="Teacher" title={teacher.name} person>
        <Link className="ghost" to="/teachers">
          Back to teachers
        </Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <div className="meta-row">
        <div>
          <span className="kicker">Age</span>
          <strong>{teacher.age}</strong>
        </div>
        <div>
          <span className="kicker">Class time</span>
          <strong className="meta-word">{label(teacher.section)}</strong>
        </div>
        <div>
          <span className="kicker">Salary still owed</span>
          <strong>{formatMoney(teacher.balance, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Last day</span>
          <strong className="meta-word">{teacher.expectedReleaseDate}</strong>
        </div>
      </div>
      <Panel tone="light">
        <p className="panel-title">Edit this record</p>
        <TeacherForm value={draft} onChange={setDraft} onSubmit={() => void save()} submitLabel="Save changes" busy={busy} />
      </Panel>
      <Panel tone="dark">
        <p className="panel-title">Record a salary payment</p>
        <form className="form-grid" onSubmit={(event) => void addPayment(event)}>
          <Field id="salary-amount" label="Amount" hint="Kenyan shillings">
            <input
              id="salary-amount"
              inputMode="decimal"
              required
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field id="salary-date" label="Date paid">
            <input
              id="salary-date"
              type="date"
              required
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
            />
          </Field>
          <Field id="salary-note" label="Note" hint="Optional, such as M-Pesa or cash.">
            <input id="salary-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className="ghost" type="submit" disabled={busy}>
            Add payment
          </button>
        </form>
        {teacher.payments.length === 0 ? (
          <p>No salary payments yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="table-caption">Salary history</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teacher.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paidOn}</td>
                    <td>{formatMoney(payment.amount, symbol)}</td>
                    <td>{payment.note || "—"}</td>
                    <td>
                      {removingPayment === payment.id ? (
                        <span className="inline-confirm">
                          Remove this payment?
                          <button type="button" className="ghost" onClick={() => void removePayment(payment.id)}>
                            Yes, remove
                          </button>
                          <button type="button" className="text-button" onClick={() => setRemovingPayment(null)}>
                            Keep it
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="text-button" onClick={() => setRemovingPayment(payment.id)}>
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
      </Panel>
      <div className="actions">
        {confirming ? (
          <div className="confirm-box" role="group" aria-label="Confirm deletion">
            <p>
              This removes {teacher.name} and every salary payment on this record. That cannot be undone.
            </p>
            <button type="button" className="solid" onClick={() => void removeTeacher()}>
              Yes, delete this record
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              Keep this record
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirming(true)}>
            Delete this teacher
          </button>
        )}
      </div>
    </>
  );
}
