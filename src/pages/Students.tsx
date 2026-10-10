import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatMoney, formatPercent, label } from "../../shared/format";
import { StudentForm } from "../components/StudentForm";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api, downloadRoster } from "../lib/api";
import { emptyStudent, type Class as SchoolClass, type Student, type StudentInput } from "../types";

export function StudentsPage() {
  const { settings } = useOutletContext<WorkspaceContext>();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StudentInput>(emptyStudent());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [body, classBody] = await Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setStudents(body.students);
    setClasses(classBody.classes);
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
      [
        student.admissionNumber,
        student.name,
        student.guardianName,
        student.guardianEmail,
        student.guardianPhone,
        student.className,
        classes.find((schoolClass) => schoolClass.id === student.classId)?.teacherNames.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, students, classes]);

  const groups = useMemo(() => {
    const selected = classFilter;
    const grouped = classes
      .filter((schoolClass) => !selected || selected === String(schoolClass.id))
      .map((schoolClass) => ({
        id: String(schoolClass.id),
        title: schoolClass.name,
        teacherNames: schoolClass.teacherNames,
        students: filtered.filter((student) => student.classId === schoolClass.id),
      }))
      .filter((group) => group.students.length > 0);
    if (!selected || selected === "unassigned") {
      const unassigned = filtered.filter((student) => student.classId == null);
      if (unassigned.length > 0) {
        grouped.push({
          id: "unassigned",
          title: "Not assigned to a class",
          teacherNames: [],
          students: unassigned,
        });
      }
    }
    return grouped;
  }, [classFilter, classes, filtered]);
  const visibleStudentCount = groups.reduce((count, group) => count + group.students.length, 0);

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
      {open ? (
        <Panel tone="light">
          <p className="panel-title">New student</p>
          <StudentForm
            value={draft}
            onChange={setDraft}
            onSubmit={() => void create()}
            submitLabel="Save student"
            busy={busy}
            classes={classes}
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
            placeholder="Name, admission, class, teacher, or guardian"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field id="student-class-filter" label="Show class">
          <select
            id="student-class-filter"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
                {schoolClass.teacherNames.length ? ` · ${schoolClass.teacherNames.join(", ")}` : ""}
              </option>
            ))}
            <option value="unassigned">Not assigned to a class</option>
          </select>
        </Field>
        <p className="count-label">
          {visibleStudentCount} {visibleStudentCount === 1 ? "student" : "students"}
        </p>
      </div>
      {!ready && !error ? (
        <p className="loading-line">Opening the student list…</p>
      ) : groups.length === 0 ? (
        <Empty>
          {students.length === 0
            ? "No students yet. Add the first one when you are ready — fees and payments will stay here."
            : classFilter === "unassigned"
              ? students.some((student) => student.classId == null)
                ? "No unassigned students match that search."
                : "No students are currently unassigned."
              : classFilter
                ? students.some((student) => String(student.classId) === classFilter)
                  ? "No students in this class match that search."
                  : "No students are assigned to this class yet."
                : "Nothing matches that search. Try a name, admission number, class, or teacher."}
        </Empty>
      ) : (
        <div className="student-class-groups" data-guide="student-list">
          {groups.map((group) => (
            <section className="student-class-group" key={group.id} aria-labelledby={`student-class-${group.id}`}>
              <header className="student-class-heading">
                <h2 id={`student-class-${group.id}`}>{group.title}</h2>
                <p>
                  {group.teacherNames.length ? `${group.teacherNames.join(", ")} · ` : ""}
                  {group.students.length} {group.students.length === 1 ? "student" : "students"}
                </p>
              </header>
              <div className="table-wrap">
                <table>
                  <caption className="table-caption">{group.title} student fees</caption>
                  <thead>
                    <tr>
                      <th>Admission</th>
                      <th>Name</th>
                      <th>Class time</th>
                      <th className="num">Age</th>
                      <th className="num">Expected</th>
                      <th className="num">Paid</th>
                      <th className="num">Balance</th>
                      <th className="num">Paid so far</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((student) => (
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
                          <Link className="row-link" to={`/students/${student.id}`}>Open record</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
