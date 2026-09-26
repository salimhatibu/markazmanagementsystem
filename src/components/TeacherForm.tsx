import { FormEvent } from "react";
import { Field } from "./ui";
import type { TeacherInput } from "../types";

export function TeacherForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy,
}: {
  value: TeacherInput;
  onChange: (value: TeacherInput) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
}) {
  function set<K extends keyof TeacherInput>(key: K, next: TeacherInput[K]) {
    onChange({ ...value, [key]: next });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <div className="form-grid">
        <Field id="teacher-name" label="Name">
          <input id="teacher-name" required value={value.name} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <Field id="teacher-dob" label="Date of birth">
          <input
            id="teacher-dob"
            type="date"
            required
            value={value.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
        </Field>
        <Field id="teacher-gender" label="Gender">
          <select
            id="teacher-gender"
            value={value.gender}
            onChange={(event) => set("gender", event.target.value as TeacherInput["gender"])}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field id="teacher-section" label="Section">
          <select
            id="teacher-section"
            value={value.section}
            onChange={(event) => set("section", event.target.value as TeacherInput["section"])}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field id="expected-salary" label="Expected salary">
          <input
            id="expected-salary"
            inputMode="decimal"
            required
            value={value.expectedSalary}
            onChange={(event) => set("expectedSalary", event.target.value)}
          />
        </Field>
        <Field id="release-date" label="Expected release date">
          <input
            id="release-date"
            type="date"
            required
            value={value.expectedReleaseDate}
            onChange={(event) => set("expectedReleaseDate", event.target.value)}
          />
        </Field>
      </div>
      <label className="check" htmlFor="paid-advance">
        <input
          id="paid-advance"
          type="checkbox"
          checked={value.paidInAdvance}
          onChange={(event) => set("paidInAdvance", event.target.checked)}
        />
        <span className="micro">&gt; Paid in advance</span>
      </label>
      <button type="submit" className="solid" disabled={busy}>
        {busy ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
