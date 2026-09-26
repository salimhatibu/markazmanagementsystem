import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { formatMoney, label } from "../../shared/format";
import { TeacherForm } from "../components/TeacherForm";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { teacherToInput, type Teacher, type TeacherInput } from "../types";

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

  async function load() {
    const body = await api<{ teacher: Teacher }>(`/api/teachers/${id}`);
    setTeacher(body.teacher);
    setDraft(teacherToInput(body.teacher));
  }

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load the teacher."));
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
      setInfo("Teacher record saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the teacher.");
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
      setError(caught instanceof Error ? caught.message : "Could not record the payment.");
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the payment.");
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
      setError(caught instanceof Error ? caught.message : "Could not delete the teacher.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!teacher || !draft) {
    return error ? <Notice>{error}</Notice> : <p className="micro">&gt; Loading</p>;
  }

  return (
    <>
      <PageHeader kicker="Teacher" title={teacher.name}>
        <Link to="/teachers">All teachers</Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <div className="meta-row">
        <div><span className="micro">&gt; Age</span><strong>{teacher.age}</strong></div>
        <div><span className="micro">&gt; Section</span><strong>{label(teacher.section)}</strong></div>
        <div><span className="micro">&gt; Salary balance</span><strong>{formatMoney(teacher.balance, symbol)}</strong></div>
        <div><span className="micro">&gt; Release</span><strong>{teacher.expectedReleaseDate}</strong></div>
      </div>
      <Panel tone="light">
        <p className="micro">&gt; Edit record</p>
        <TeacherForm value={draft} onChange={setDraft} onSubmit={() => void save()} submitLabel="Save changes" busy={busy} />
      </Panel>
      <Panel tone="dark">
        <p className="micro">&gt; Salary payment</p>
        <form className="form-grid" onSubmit={(event) => void addPayment(event)}>
          <Field id="salary-amount" label="Amount">
            <input id="salary-amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field id="salary-date" label="Date">
            <input id="salary-date" type="date" required value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
          </Field>
          <Field id="salary-note" label="Note">
            <input id="salary-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className="ghost" type="submit" disabled={busy}>Record payment</button>
        </form>
        {teacher.payments.length === 0 ? <p>No salary payments yet.</p> : (
          <div className="table-wrap">
            <table>
              <caption className="micro">&gt; Salary history</caption>
              <thead><tr><th>Date</th><th>Amount</th><th>Note</th><th>Remove</th></tr></thead>
              <tbody>
                {teacher.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paidOn}</td>
                    <td>{formatMoney(payment.amount, symbol)}</td>
                    <td>{payment.note || "—"}</td>
                    <td><button type="button" className="ghost" onClick={() => void removePayment(payment.id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="actions">
        {confirming ? (
          <div role="group" aria-label="Confirm deletion">
            <p>Delete this teacher and the salary history?</p>
            <button type="button" className="solid" onClick={() => void removeTeacher()}>Delete record</button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>Keep record</button>
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirming(true)}>Delete teacher</button>
        )}
      </div>
    </>
  );
}
