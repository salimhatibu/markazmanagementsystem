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
  const [ready, setReady] = useState(false);

  async function load() {
    const body = await api<{ teachers: Teacher[] }>("/api/teachers");
    setTeachers(body.teachers);
    setReady(true);
  }

  useEffect(() => {
    load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "The teacher list could not be opened."),
    );
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
      setError(caught instanceof Error ? caught.message : "The teacher could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;

  return (
    <>
      <PageHeader
        kicker="Records"
        title="Teachers"
        lead="Salaries, class times, and expected last days stay on an open ledger."
      >
        <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close form" : "Add a teacher"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {open ? (
        <Panel tone="light">
          <p className="panel-title">New teacher</p>
          <TeacherForm
            value={draft}
            onChange={setDraft}
            onSubmit={() => void create()}
            submitLabel="Save teacher"
            busy={busy}
          />
        </Panel>
      ) : null}
      <div className="toolbar">
        <Field id="teacher-search" label="Find a teacher">
          <input
            id="teacher-search"
            className="search"
            type="search"
            autoComplete="off"
            placeholder="Name or class time"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="count-label">
          {filtered.length} {filtered.length === 1 ? "teacher" : "teachers"}
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening the teacher list…</p>
      ) : filtered.length === 0 ? (
        <Empty>
          {teachers.length === 0
            ? "No teachers yet. Add someone when you are ready and the salary history will stay here."
            : "Nothing matches that search. Try a name or morning / evening."}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="table-caption">Teacher salaries</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Class time</th>
                <th>Age</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Last day</th>
                <th>Advance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id}>
                  <td data-label="Name">{teacher.name}</td>
                  <td data-label="Class time">{label(teacher.section)}</td>
                  <td data-label="Age">{teacher.age}</td>
                  <td data-label="Expected">{formatMoney(teacher.expectedSalary, symbol)}</td>
                  <td data-label="Paid">{formatMoney(teacher.paid, symbol)}</td>
                  <td data-label="Balance">{formatMoney(teacher.balance, symbol)}</td>
                  <td data-label="Last day">{teacher.expectedReleaseDate}</td>
                  <td data-label="Advance">{teacher.paidInAdvance ? "Yes" : "No"}</td>
                  <td>
                    <Link className="row-link" to={`/teachers/${teacher.id}`}>
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
