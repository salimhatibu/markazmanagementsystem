import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatMoney, formatPercent, label } from "../../shared/format";
import { StudentForm } from "../components/StudentForm";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { emptyStudent, type Student, type StudentInput } from "../types";

export function StudentsPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StudentInput>(emptyStudent());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const body = await api<{ students: Student[] }>("/api/students");
    setStudents(body.students);
  }

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load students."));
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
      setError(caught instanceof Error ? caught.message : "Could not save the student.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader kicker="Records" title="Students">
        <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close form" : "Add student"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {open ? (
        <Panel tone="light">
          <p className="micro">&gt; New student</p>
          <StudentForm value={draft} onChange={setDraft} onSubmit={() => void create()} submitLabel="Save student" busy={busy} />
        </Panel>
      ) : null}
      <div className="toolbar">
        <Field id="student-search" label="Search">
          <input id="student-search" className="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <p className="micro">&gt; {filtered.length} shown</p>
      </div>
      {filtered.length === 0 ? (
        <Empty>No students match this view.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="micro">&gt; Student ledger</caption>
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
                <th>Section</th>
                <th>Age</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Percent</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td>{student.admissionNumber}</td>
                  <td>{student.name}</td>
                  <td>{label(student.section)}</td>
                  <td>{student.age}</td>
                  <td>{formatMoney(student.expectedFees, symbol)}</td>
                  <td>{formatMoney(student.paid, symbol)}</td>
                  <td>{formatMoney(student.balance, symbol)}</td>
                  <td>{formatPercent(student.percentPaid)}</td>
                  <td>
                    <Link to={`/students/${student.id}`}>Record</Link>
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
