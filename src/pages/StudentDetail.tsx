import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { eatDate, formatMoney, formatPercent, label } from "../../shared/format";
import { StudentForm } from "../components/StudentForm";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { studentToInput, type Student, type StudentInput } from "../types";

function today() {
  return eatDate();
}

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [student, setStudent] = useState<Student | null>(null);
  const [draft, setDraft] = useState<StudentInput | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  async function load() {
    const body = await api<{ student: Student }>(`/api/students/${id}`);
    setStudent(body.student);
    setDraft(studentToInput(body.student));
  }

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load the student."));
    api<{ configured: boolean }>("/api/mail")
      .then((body) => setMailConfigured(body.configured))
      .catch(() => setMailConfigured(false));
  }, [id]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const body = await api<{ student: Student }>(`/api/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setStudent(body.student);
      setDraft(studentToInput(body.student));
      setInfo("Student record saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the student.");
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ student: Student }>(`/api/students/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, paidOn, note }),
      });
      setStudent(body.student);
      setDraft(studentToInput(body.student));
      setAmount("");
      setNote("");
      setInfo("Payment recorded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(paymentId: number) {
    setBusy(true);
    setError("");
    try {
      const body = await api<{ student: Student }>(`/api/fee-payments/${paymentId}`, { method: "DELETE" });
      setStudent(body.student);
      setDraft(studentToInput(body.student));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent() {
    setBusy(true);
    try {
      await api(`/api/students/${id}`, { method: "DELETE" });
      navigate("/students");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the student.");
      setBusy(false);
    }
  }

  async function sendAlert() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api(`/api/students/${id}/balance-alert`, { method: "POST" });
      setInfo("Balance alert sent to the guardian email.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send mail.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!student || !draft) {
    return error ? <Notice>{error}</Notice> : <p className="micro">&gt; Loading</p>;
  }

  return (
    <>
      <PageHeader kicker={student.admissionNumber} title={student.name}>
        <Link to="/students">All students</Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <div className="meta-row">
        <div><span className="micro">&gt; Age</span><strong>{student.age}</strong></div>
        <div><span className="micro">&gt; Section</span><strong>{label(student.section)}</strong></div>
        <div><span className="micro">&gt; Balance</span><strong>{formatMoney(student.balance, symbol)}</strong></div>
        <div><span className="micro">&gt; Percent paid</span><strong>{formatPercent(student.percentPaid)}</strong></div>
      </div>
      <Panel tone="light">
        <p className="micro">&gt; Edit record</p>
        <StudentForm value={draft} onChange={setDraft} onSubmit={() => void save()} submitLabel="Save changes" busy={busy} />
      </Panel>
      <Panel tone="dark">
        <p className="micro">&gt; Fee payment</p>
        <form className="form-grid" onSubmit={(event) => void addPayment(event)}>
          <Field id="pay-amount" label="Amount">
            <input id="pay-amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field id="pay-date" label="Date">
            <input id="pay-date" type="date" required value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
          </Field>
          <Field id="pay-note" label="Note">
            <input id="pay-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className="ghost" type="submit" disabled={busy}>Record payment</button>
        </form>
        {student.payments.length === 0 ? <p>No payments yet. The balance stays open.</p> : (
          <div className="table-wrap">
            <table>
              <caption className="micro">&gt; Payment history</caption>
              <thead><tr><th>Date</th><th>Amount</th><th>Note</th><th>Remove</th></tr></thead>
              <tbody>
                {student.payments.map((payment) => (
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
      <Panel tone="light">
        <p className="micro">&gt; Balance alert</p>
        {mailConfigured === null ? (
          <p className="micro">&gt; Checking mail</p>
        ) : mailConfigured ? (
          <button type="button" className="solid" disabled={busy} onClick={() => void sendAlert()}>
            Email guardian
          </button>
        ) : (
          <p>
            Mail is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MARKAZ_FROM on the Netlify site
            before a balance alert can be sent.
          </p>
        )}
      </Panel>
      <div className="actions">
        {confirming ? (
          <div role="group" aria-label="Confirm deletion">
            <p>Delete this student and the fee history?</p>
            <button type="button" className="solid" onClick={() => void removeStudent()}>Delete record</button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>Keep record</button>
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirming(true)}>Delete student</button>
        )}
      </div>
    </>
  );
}
