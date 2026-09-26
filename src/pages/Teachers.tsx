import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatMoney, label } from "../../shared/format";
import { TeacherForm } from "../components/TeacherForm";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { emptyTeacher, type Teacher, type TeacherInput } from "../types";

export function TeachersPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TeacherInput>(emptyTeacher());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const body = await api<{ teachers: Teacher[] }>("/api/teachers");
    setTeachers(body.teachers);
  }

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load teachers."));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((teacher) => `${teacher.name} ${teacher.section}`.toLowerCase().includes(needle));
  }, [query, teachers]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/api/teachers", { method: "POST", body: JSON.stringify(draft) });
      setDraft(emptyTeacher());
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the teacher.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader kicker="Records" title="Teachers">
        <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close form" : "Add teacher"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {open ? (
        <Panel tone="light">
          <p className="micro">&gt; New teacher</p>
          <TeacherForm value={draft} onChange={setDraft} onSubmit={() => void create()} submitLabel="Save teacher" busy={busy} />
        </Panel>
      ) : null}
      <div className="toolbar">
        <Field id="teacher-search" label="Search">
          <input id="teacher-search" className="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <p className="micro">&gt; {filtered.length} shown</p>
      </div>
      {filtered.length === 0 ? <Empty>No teachers match this view.</Empty> : (
        <div className="table-wrap">
          <table>
            <caption className="micro">&gt; Teacher ledger</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Section</th>
                <th>Age</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Release</th>
                <th>Advance</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.name}</td>
                  <td>{label(teacher.section)}</td>
                  <td>{teacher.age}</td>
                  <td>{formatMoney(teacher.expectedSalary, symbol)}</td>
                  <td>{formatMoney(teacher.paid, symbol)}</td>
                  <td>{formatMoney(teacher.balance, symbol)}</td>
                  <td>{teacher.expectedReleaseDate}</td>
                  <td>{teacher.paidInAdvance ? "Yes" : "No"}</td>
                  <td><Link to={`/teachers/${teacher.id}`}>Record</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
