import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { eatDate, formatMoney, formatPercent, label } from "../../shared/format";
import { EVENING_FEES, MORNING_FEES } from "../../shared/letterhead";
import { StudentForm } from "../components/StudentForm";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api, downloadPersonRecord } from "../lib/api";
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
  const [leaving, setLeaving] = useState(false);
  const [leftOn, setLeftOn] = useState(today);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");
  const [removingPayment, setRemovingPayment] = useState<number | null>(null);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  async function load() {
    const body = await api<{ student: Student }>(`/api/students/${id}`);
    setStudent(body.student);
    setDraft(studentToInput(body.student));
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "This student record could not be opened."),
    );
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
      setInfo("Saved. The details are up to date.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be saved.");
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
      setError(caught instanceof Error ? caught.message : "The payment could not be recorded.");
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
      setRemovingPayment(null);
      setInfo("That payment was removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be removed.");
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
      setError(caught instanceof Error ? caught.message : "The student could not be deleted.");
      setBusy(false);
    }
  }

  async function moveToKharajah(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ leaver: { id: number } }>("/api/kharajah", {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(id),
          leftOn,
          leaveReason,
          notes: leaveNotes.trim() || null,
        }),
      });
      navigate(`/kharajah/${body.leaver.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be moved to Kharajah.");
      setBusy(false);
    }
  }

  async function sendAlert() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api(`/api/students/${id}/balance-alert`, { method: "POST" });
      setInfo("A reminder was sent to the guardian email.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reminder could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!student || !draft) {
    return error ? <Notice>{error}</Notice> : <p className="loading-line">Opening this record…</p>;
  }

  return (
    <>
      <PageHeader kicker={student.admissionNumber} title={student.name} person>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            void downloadPersonRecord(
              "students",
              student.id,
              `student-${student.admissionNumber}.pdf`,
            )
              .catch((caught: unknown) =>
                setError(caught instanceof Error ? caught.message : "The record could not be downloaded."),
              )
              .finally(() => setBusy(false));
          }}
        >
          Download record
        </button>
        <Link className="ghost" to="/students">
          Back to students
        </Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <div className="meta-row">
        <div>
          <span className="kicker">Age</span>
          <strong>{student.age}</strong>
        </div>
        <div>
          <span className="kicker">Class time</span>
          <strong className="meta-word">{label(student.section)}</strong>
        </div>
        <div>
          <span className="kicker">Admitted</span>
          <strong className="meta-word">{student.admittedOn || "—"}</strong>
        </div>
        <div>
          <span className="kicker">Balance</span>
          <strong>{formatMoney(student.balance, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Paid so far</span>
          <strong>{formatPercent(student.percentPaid)}</strong>
        </div>
        <div>
          <span className="kicker">Admission</span>
          <strong className="meta-word">
            {student.admissionFeeCollected
              ? formatMoney(student.admissionFeeAmount, symbol)
              : "Not collected"}
          </strong>
        </div>
      </div>
      <Panel tone="light">
        <p className="panel-title">Edit this record</p>
        <StudentForm value={draft} onChange={setDraft} onSubmit={() => void save()} submitLabel="Save changes" busy={busy} />
      </Panel>
      <Panel tone="dark">
        <p className="panel-title">Record a fee payment</p>
        <form className="form-grid" onSubmit={(event) => void addPayment(event)}>
          <Field
            id="pay-amount"
            label="Amount"
            hint={
              student.section === "evening"
                ? `Evening installments: ${EVENING_FEES.installments.map((row) => row.amount.toLocaleString("en-GB")).join(", ")}.`
                : `Morning installments: ${MORNING_FEES.installments.map((row) => row.amount.toLocaleString("en-GB")).join(", ")}.`
            }
          >
            <input
              id="pay-amount"
              inputMode="decimal"
              required
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field id="pay-date" label="Date paid">
            <input id="pay-date" type="date" required value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
          </Field>
          <Field id="pay-note" label="M-Pesa ref no" hint="The SMS reference, such as TD12ABC123. Leave blank for cash.">
            <input id="pay-note" placeholder="TD12ABC123" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className="ghost" type="submit" disabled={busy}>
            Add payment
          </button>
        </form>
        {student.payments.length === 0 ? (
          <p>No payments yet. The balance stays open until something is recorded.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="table-caption">Payment history</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>M-Pesa ref</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {student.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Date">{payment.paidOn}</td>
                    <td data-label="Amount">{formatMoney(payment.amount, symbol)}</td>
                    <td data-label="M-Pesa ref">{payment.note || "—"}</td>
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
      <Panel tone="light">
        <p className="panel-title">Send a fee reminder</p>
        {mailConfigured === null ? (
          <p>Checking whether email is ready…</p>
        ) : mailConfigured ? (
          <>
            <p>This sends the current balance to {student.guardianEmail}.</p>
            <button type="button" className="solid" disabled={busy} onClick={() => void sendAlert()}>
              Email the guardian
            </button>
          </>
        ) : (
          <p>
            Reminders are not ready yet. Once the office mailbox is connected in Settings, you can send a balance from
            this page.
          </p>
        )}
      </Panel>
      <Panel tone="dark">
        <p className="panel-title">Move to Kharajah</p>
        <p>
          When {student.name} leaves the markaz, record the reason here. Their details move to Kharajah and leave the
          active students list.
        </p>
        {error && leaving ? <Notice>{error}</Notice> : null}
        {leaving ? (
          <form className="form-grid" onSubmit={(event) => void moveToKharajah(event)}>
            <Field id="leave-date" label="Date of leaving">
              <input
                id="leave-date"
                type="date"
                required
                value={leftOn}
                onChange={(event) => setLeftOn(event.target.value)}
              />
            </Field>
            <Field id="leave-reason" label="Reason for leaving">
              <textarea
                id="leave-reason"
                required
                rows={3}
                value={leaveReason}
                onChange={(event) => setLeaveReason(event.target.value)}
                placeholder="Completed studies, transferred, family moved…"
              />
            </Field>
            <Field id="leave-notes" label="Notes (optional)">
              <textarea
                id="leave-notes"
                rows={2}
                value={leaveNotes}
                onChange={(event) => setLeaveNotes(event.target.value)}
                placeholder="Anything else the office should keep"
              />
            </Field>
            <div className="actions">
              <button type="submit" className="solid" disabled={busy}>
                {busy ? "Moving…" : "Confirm leave"}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  setLeaving(false);
                  setLeaveReason("");
                  setLeaveNotes("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="solid" disabled={busy} onClick={() => setLeaving(true)}>
            Record leave
          </button>
        )}
      </Panel>
      <div className="actions">
        {confirming ? (
          <div className="confirm-box" role="group" aria-label="Confirm deletion">
            <p>
              This permanently deletes {student.name} and every fee payment on this record, without keeping a Kharajah
              entry. Prefer “Move to Kharajah” if they have left the markaz.
            </p>
            <button type="button" className="solid" onClick={() => void removeStudent()}>
              Yes, delete this record
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              Keep this record
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirming(true)}>
            Delete this student
          </button>
        )}
      </div>
    </>
  );
}
