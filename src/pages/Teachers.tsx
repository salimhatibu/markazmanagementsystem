import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatMoney, label } from "../../shared/format";
import { OcrUpload } from "../components/OcrUpload";
import { TeacherForm } from "../components/TeacherForm";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api, downloadRoster } from "../lib/api";
import { teacherFromOcr } from "../lib/ocr-fields";
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
    return teachers.filter((teacher) =>
      [teacher.name, teacher.section, teacher.phone, teacher.nationalId, teacher.mpesaName, teacher.mpesaNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
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
        lead="Name, phone, ID number, and salary — the same columns as the official salary sheet."
      >
        <button
          type="button"
          className="ghost"
          disabled={busy || teachers.length === 0}
          onClick={() => {
            setBusy(true);
            setError("");
            void downloadRoster("teachers", "markaz-teachers.pdf")
              .catch((caught: unknown) =>
                setError(caught instanceof Error ? caught.message : "The teacher list could not be downloaded."),
              )
              .finally(() => setBusy(false));
          }}
        >
          Download list
        </button>
        <button
          type="button"
          className="ghost"
          data-guide="add-teacher"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close form" : "Add a teacher"}
        </button>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      <Panel tone="light" className="ocr-panel">
        <OcrUpload
          kind="teacher"
          disabled={busy}
          onError={setError}
          onFields={(fields) => {
            setDraft(teacherFromOcr(fields));
            setOpen(true);
            setError("");
          }}
        />
      </Panel>
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
            placeholder="Name, phone, or ID"
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
        <div className="table-wrap" data-guide="teacher-list">
          <table>
            <caption className="table-caption">Teacher salaries</caption>
            <thead>
              <tr>
                <th>No.</th>
                <th>Name of the applicant</th>
                <th>Phone number</th>
                <th>ID number</th>
                <th>Class time</th>
                <th>Salary</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Last day</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher, index) => (
                <tr key={teacher.id}>
                  <td data-label="No.">{index + 1}</td>
                  <td data-label="Name of the applicant">
                    {teacher.mpesaName && teacher.mpesaName !== teacher.name
                      ? `${teacher.name} (${teacher.mpesaName})`
                      : teacher.name}
                  </td>
                  <td data-label="Phone number">{teacher.mpesaNumber || teacher.phone || "—"}</td>
                  <td data-label="ID number">{teacher.nationalId || "—"}</td>
                  <td data-label="Class time">{label(teacher.section)}</td>
                  <td data-label="Salary">{formatMoney(teacher.expectedSalary, symbol)}</td>
                  <td data-label="Paid">{formatMoney(teacher.paid, symbol)}</td>
                  <td data-label="Balance">{formatMoney(teacher.balance, symbol)}</td>
                  <td data-label="Last day">{teacher.expectedReleaseDate}</td>
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
