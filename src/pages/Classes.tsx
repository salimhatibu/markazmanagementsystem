import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { Class as ClassSummary, Student } from "../types";

type ClassDetail = Omit<ClassSummary, "students"> & {
  students: Student[];
};

export function ClassesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [current, setCurrent] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function loadList() {
    const body = await api<{ classes: ClassSummary[] }>("/api/classes");
    setClasses(body.classes);
    setReady(true);
  }

  async function loadDetail(classId: string) {
    const [detail, roster] = await Promise.all([
      api<{ class: ClassSummary; students: Student[] }>(`/api/classes/${classId}`),
      api<{ students: Student[] }>("/api/students"),
    ]);
    setCurrent({ ...detail.class, students: detail.students });
    setStudents(roster.students);
    setReady(true);
  }

  useEffect(() => {
    setReady(false);
    setCurrent(null);
    setError("");
    const load = id ? loadDetail(id) : loadList();
    load.catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Classes could not be opened.");
      setReady(true);
    });
  }, [id]);

  const availableStudents = useMemo(
    () => students.filter((student) => student.classId == null),
    [students],
  );

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const body = await api<{ class: ClassSummary }>("/api/classes", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await loadList();
      navigate(`/classes/${body.class.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The class could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!id || !studentId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/classes/${id}/students`, {
        method: "POST",
        body: JSON.stringify({ studentId: Number(studentId) }),
      });
      setStudentId("");
      await loadDetail(id);
      await loadList();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be assigned.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(student: Student) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/classes/${id}/students/${student.id}`, { method: "DELETE" });
      await loadDetail(id);
      await loadList();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        kicker="Records"
        title={current ? current.name : "Classes"}
        lead={current ? "Manage the students assigned to this class." : "Create teaching groups and manage their student lists."}
      >
        {current ? <Link className="ghost" to="/classes">All classes</Link> : null}
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}

      {id ? (
        <>
          {!ready && !error ? <p className="loading-line">Opening this class…</p> : null}
          {ready && current ? (
            <>
              <Panel tone="light" className="class-assign-panel">
                <p className="panel-title">Assign a student</p>
                {availableStudents.length > 0 ? (
                  <form className="class-assign-form" onSubmit={(event) => void assign(event)}>
                    <Field id="class-student" label="Student">
                      <select
                        id="class-student"
                        value={studentId}
                        onChange={(event) => setStudentId(event.target.value)}
                        required
                      >
                        <option value="">Choose an unassigned student</option>
                        {availableStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} · {student.admissionNumber}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button type="submit" className="solid" disabled={busy || !studentId}>
                      {busy ? "Saving…" : "Assign student"}
                    </button>
                  </form>
                ) : (
                  <p className="field-hint">
                    {students.length === 0
                      ? "There are no students on the student list yet."
                      : "All students are already assigned to a class."}
                  </p>
                )}
              </Panel>
              <div className="class-roster-head">
                <h2>Students</h2>
                <p>{current.students.length} {current.students.length === 1 ? "student" : "students"}</p>
              </div>
              {current.students.length === 0 ? (
                <Empty>No students assigned yet. Choose a student above to add them to this class.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <caption className="table-caption">{current.name} students</caption>
                    <thead>
                      <tr><th>Admission</th><th>Name</th><th>Section</th><th></th></tr>
                    </thead>
                    <tbody>
                      {current.students.map((student) => (
                        <tr key={student.id}>
                          <td data-label="Admission">{student.admissionNumber}</td>
                          <td data-label="Name"><Link className="row-link" to={`/students/${student.id}`}>{student.name}</Link></td>
                          <td data-label="Section">{student.section}</td>
                          <td data-label="Action">
                            <button type="button" className="row-link class-remove" disabled={busy} onClick={() => void removeStudent(student)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          <Panel tone="light" className="class-create-panel">
            <p className="panel-title">Create a class</p>
            <form className="class-create-form" onSubmit={(event) => void create(event)}>
              <Field id="class-name" label="Class name">
                <input
                  id="class-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  placeholder="e.g. Qur’an class"
                  required
                />
              </Field>
              <button type="submit" className="solid" disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Create class"}
              </button>
            </form>
          </Panel>
          <div className="class-roster-head">
            <h2>All classes</h2>
            <p>{classes.length} {classes.length === 1 ? "class" : "classes"}</p>
          </div>
          {!ready && !error ? (
            <p className="loading-line">Opening classes…</p>
          ) : classes.length === 0 ? (
            <Empty>No classes yet. Create the first class above.</Empty>
          ) : (
            <div className="class-list">
              {classes.map((schoolClass) => (
                <Link key={schoolClass.id} className="class-list-item" to={`/classes/${schoolClass.id}`}>
                  <span>
                    <strong>{schoolClass.name}</strong>
                    <small>{schoolClass.students} {schoolClass.students === 1 ? "student" : "students"}</small>
                  </span>
                  <span className="class-list-arrow" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
