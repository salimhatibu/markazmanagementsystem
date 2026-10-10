import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { eatDate, formatMoney, label } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { KharajahLeaver, Student } from "../types";

export function KharajahPage() {
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [leavers, setLeavers] = useState<KharajahLeaver[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [leftOn, setLeftOn] = useState(eatDate);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");

  async function load() {
    const [leaversBody, studentsBody] = await Promise.all([
      api<{ leavers: KharajahLeaver[] }>("/api/kharajah"),
      api<{ students: Student[] }>("/api/students"),
    ]);
    setLeavers(leaversBody.leavers);
    setStudents(studentsBody.students);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The Kharajah list could not be opened."),
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leavers;
    return leavers.filter((row) =>
      [row.admissionNumber, row.name, row.guardianName, row.leaveReason, row.guardianPhone]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, leavers]);

  async function recordLeave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api<{ leaver: { id: number } }>("/api/kharajah", {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(studentId),
          leftOn,
          leaveReason,
          notes: leaveNotes.trim() || null,
        }),
      });
      navigate(`/kharajah/${body.leaver.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The leave could not be recorded.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="People"
        title="Kharajah"
        lead="Students who have left the markaz. Record a leave here — their details move off the active students list and stay on this register."
      >
        <button
          type="button"
          className="solid"
          data-guide="kharajah-record"
          disabled={busy || students.length === 0}
          onClick={() => {
            setRecording(true);
            setError("");
          }}
        >
          Record a leave
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}

      {recording ? (
        <Panel tone="light">
          <p className="panel-title">Record a leave</p>
          <p>Choose an active student, the date they left, and the reason. They leave Students and appear here.</p>
          {students.length === 0 ? (
            <p>There are no active students to move. Add someone under Students first.</p>
          ) : (
            <form className="form-grid" onSubmit={(event) => void recordLeave(event)}>
              <Field id="leave-student" label="Student">
                <select
                  id="leave-student"
                  required
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                >
                  <option value="">Choose a student…</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.admissionNumber} — {student.name}
                    </option>
                  ))}
                </select>
              </Field>
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
                  {busy ? "Recording…" : "Confirm leave"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRecording(false);
                    setStudentId("");
                    setLeaveReason("");
                    setLeaveNotes("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Panel>
      ) : null}

      <div className="toolbar">
        <Field id="kharajah-search" label="Find a leaver">
          <input
            id="kharajah-search"
            className="search"
            type="search"
            autoComplete="off"
            placeholder="Name, admission number, or reason"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="count-label">
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening Kharajah…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {leavers.length === 0
            ? "No one is on Kharajah yet. Use “Record a leave” above, or open a student and move them here."
            : "Nothing matches that search."}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="table-caption">Students who left</caption>
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
                <th>Class time</th>
                <th>Left on</th>
                <th>Reason</th>
                <th className="num">Fees paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td data-label="Admission">{row.admissionNumber}</td>
                  <td data-label="Name">{row.name}</td>
                  <td data-label="Class time">{label(row.section)}</td>
                  <td data-label="Left on">{row.leftOn}</td>
                  <td data-label="Reason">{row.leaveReason}</td>
                  <td data-label="Fees paid">{formatMoney(row.feesPaid, symbol)}</td>
                  <td>
                    <Link className="row-link" to={`/kharajah/${row.id}`}>
                      Open record
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
