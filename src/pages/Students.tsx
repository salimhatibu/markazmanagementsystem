import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatMoney, formatPercent, label } from "../../shared/format";
import { OcrUpload } from "../components/OcrUpload";
import { StudentForm } from "../components/StudentForm";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api, downloadRoster } from "../lib/api";
import { studentFromOcr } from "../lib/ocr-fields";
import { emptyStudent, type Student, type StudentInput } from "../types";

export function StudentsPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StudentInput>(emptyStudent());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const body = await api<{ students: Student[] }>("/api/students");
    setStudents(body.students);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The student list could not be opened."),
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.admissionNumber, student.name, student.guardianName, student.guardianEmail, student.guardianPhone]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, students]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/api/students", { method: "POST", body: JSON.stringify(draft) });
      setDraft(emptyStudent());
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="Records"
        title="Students"
        lead="Admission, section, and term fees. Morning is 15,000 a term; evening is 9,000, or 10,000 for Hadhaanah."
      >
        <button
          type="button"
          className="ghost"
          disabled={busy || students.length === 0}
          onClick={() => {
            setBusy(true);
            setError("");
            void downloadRoster("students", "markaz-students.pdf")
              .catch((caught: unknown) =>
                setError(caught instanceof Error ? caught.message : "The student list could not be downloaded."),
              )
              .finally(() => setBusy(false));
          }}
        >
          Download list
        </button>
        <button
          type="button"
          className="ghost"
          data-guide="add-student"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close form" : "Add a student"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      <Panel tone="light" className="ocr-panel">
        <OcrUpload
          kind="student"
          disabled={busy}
          onError={setError}
          onFields={(fields) => {
            setDraft(studentFromOcr(fields));
            setOpen(true);
            setError("");
          }}
        />
      </Panel>
      {open ? (
        <Panel tone="light">
          <p className="panel-title">New student</p>
          <StudentForm
            value={draft}
            onChange={setDraft}
            onSubmit={() => void create()}
            submitLabel="Save student"
            busy={busy}
          />
        </Panel>
      ) : null}
      <div className="toolbar">
        <Field id="student-search" label="Find a student">
          <input
            id="student-search"
            className="search"
            type="search"
            autoComplete="off"
            placeholder="Name, admission number, or guardian"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="count-label">
          {filtered.length} {filtered.length === 1 ? "student" : "students"}
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening the student list…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {students.length === 0
            ? "No students yet. Add the first one when you are ready — fees and payments will stay here."
            : "Nothing matches that search. Try a name or admission number."}
        </Empty>
      ) : (
        <div className="table-wrap" data-guide="student-list">
          <table>
            <caption className="table-caption">Student fees</caption>
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
                <th>Class time</th>
                <th>Age</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Paid so far</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td data-label="Admission">{student.admissionNumber}</td>
                  <td data-label="Name">{student.name}</td>
                  <td data-label="Class time">{label(student.section)}</td>
                  <td data-label="Age">{student.age}</td>
                  <td data-label="Expected">{formatMoney(student.expectedFees, symbol)}</td>
                  <td data-label="Paid">{formatMoney(student.paid, symbol)}</td>
                  <td data-label="Balance">{formatMoney(student.balance, symbol)}</td>
                  <td data-label="Paid so far">{formatPercent(student.percentPaid)}</td>
                  <td>
                    <Link className="row-link" to={`/students/${student.id}`}>
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
