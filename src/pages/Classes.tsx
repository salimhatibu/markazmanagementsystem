import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StudentForm } from "../components/StudentForm";
import { Empty, Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import {
  emptyClass,
  emptyStudent,
  type Class as ClassSummary,
  type ClassInput,
  type Student,
  type StudentInput,
} from "../types";

type TeacherOption = { id: number; name: string };

type ClassDetail = Omit<ClassSummary, "students"> & {
  students: Student[];
};

export function ClassesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [current, setCurrent] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [draft, setDraft] = useState<ClassInput>(emptyClass());
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [studentDraft, setStudentDraft] = useState<StudentInput>(emptyStudent());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function loadList() {
    const [body, roster] = await Promise.all([
      api<{ classes: ClassSummary[] }>("/api/classes"),
      api<{ teachers: TeacherOption[] }>("/api/teachers"),
    ]);
    setClasses(body.classes);
    setTeachers(roster.teachers);
    setReady(true);
  }

  async function loadDetail(classId: string) {
    const [detail, roster, teacherRoster] = await Promise.all([
      api<{ class: ClassSummary; students: Student[] }>(`/api/classes/${classId}`),
      api<{ students: Student[] }>("/api/students"),
      api<{ teachers: TeacherOption[] }>("/api/teachers"),
    ]);
    setCurrent({ ...detail.class, students: detail.students });
    setStudents(roster.students);
    setTeachers(teacherRoster.teachers);
    setDraft({ name: detail.class.name, teacherId: detail.class.teacherId });
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
    if (!draft.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const body = await api<{ class: ClassSummary }>("/api/classes", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setDraft(emptyClass());
      await loadList();
      navigate(`/classes/${body.class.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The class could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function saveClass(event: FormEvent) {
    event.preventDefault();
    if (!id || !draft.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/classes/${id}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setEditing(false);
      await loadDetail(id);
      await loadList();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The class could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteClass() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/classes/${id}`, { method: "DELETE" });
      await loadList();
      navigate("/classes");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The class could not be deleted.");
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

  async function createAndAssignStudent() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/students", {
        method: "POST",
        body: JSON.stringify({ ...studentDraft, classId: Number(id) }),
      });
      setStudentDraft(emptyStudent());
      setAddStudentOpen(false);
      await loadDetail(id);
      await loadList();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The student could not be added to this class.");
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
        lead={current ? `Manage students${current.teacherName ? ` taught by ${current.teacherName}` : ""} in this class.` : "Create teaching groups, assign teachers, and manage student lists."}
      >
        {current ? (
          <div className="class-page-actions">
            <Link className="ghost" to="/classes">All classes</Link>
            <button type="button" className="ghost" onClick={() => setEditing((value) => !value)}>
              {editing ? "Cancel edit" : "Edit class"}
            </button>
          </div>
        ) : null}
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}

      {id ? (
        <>
          {!ready && !error ? <p className="loading-line">Opening this class…</p> : null}
          {ready && current ? (
            <>
              {editing ? (
                <Panel tone="light" className="class-create-panel">
                  <p className="panel-title">Edit class</p>
                  <form className="class-create-form" onSubmit={(event) => void saveClass(event)}>
                    <Field id="edit-class-name" label="Class name">
                      <input
                        id="edit-class-name"
                        value={draft.name}
                        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        maxLength={80}
                        required
                      />
                    </Field>
                    <Field id="edit-class-teacher" label="Teacher">
                      <select
                        id="edit-class-teacher"
                        value={draft.teacherId ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, teacherId: event.target.value ? Number(event.target.value) : null })
                        }
                      >
                        <option value="">No teacher assigned</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </Field>
                    <button type="submit" className="solid" disabled={busy || !draft.name.trim()}>
                      {busy ? "Saving…" : "Save class"}
                    </button>
                  </form>
                </Panel>
              ) : null}
              <Panel tone="light" className="class-assign-panel">
                <div className="class-assign-head">
                  <p className="panel-title">Add a student</p>
                  <button
                    type="button"
                    className="ghost"
                    aria-expanded={addStudentOpen}
                    onClick={() => setAddStudentOpen((open) => !open)}
                  >
                    {addStudentOpen ? "Cancel new student" : "Create student"}
                  </button>
                </div>
                {addStudentOpen ? (
                  <StudentForm
                    value={studentDraft}
                    onChange={setStudentDraft}
                    onSubmit={() => void createAndAssignStudent()}
                    submitLabel="Create student in this class"
                    busy={busy}
                    classes={current ? [current] : []}
                  />
                ) : null}
                <p className="field-hint class-existing-student-label">Or add an existing student</p>
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
              <div className="class-delete-actions">
                {confirmDelete ? (
                  <div className="confirm-box" role="group" aria-label="Confirm class deletion">
                    <p>
                      Delete {current.name}? Its students will remain in the student list, unassigned to a class.
                    </p>
                    <button type="button" className="solid" disabled={busy} onClick={() => void deleteClass()}>
                      {busy ? "Deleting…" : "Yes, delete class"}
                    </button>
                    <button type="button" className="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
                      Keep class
                    </button>
                  </div>
                ) : (
                  <button type="button" className="text-button class-delete-button" onClick={() => setConfirmDelete(true)}>
                    Delete this class
                  </button>
                )}
              </div>
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
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  maxLength={80}
                  placeholder="e.g. Qur’an class"
                  required
                />
              </Field>
              <Field id="class-teacher" label="Teacher">
                <select
                  id="class-teacher"
                  value={draft.teacherId ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, teacherId: event.target.value ? Number(event.target.value) : null })
                  }
                >
                  <option value="">No teacher assigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </Field>
              <button type="submit" className="solid" disabled={busy || !draft.name.trim()}>
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
                    <small>
                      {schoolClass.teacherName ? `${schoolClass.teacherName} · ` : ""}
                      {schoolClass.students} {schoolClass.students === 1 ? "student" : "students"}
                    </small>
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
