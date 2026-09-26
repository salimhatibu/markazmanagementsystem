import { FormEvent } from "react";
import { Field } from "./ui";
import type { StudentInput } from "../types";

export function StudentForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy,
}: {
  value: StudentInput;
  onChange: (value: StudentInput) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
}) {
  function set<K extends keyof StudentInput>(key: K, next: StudentInput[K]) {
    onChange({ ...value, [key]: next });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <div className="form-grid">
        <Field id="admission" label="Admission number">
          <input
            id="admission"
            required
            value={value.admissionNumber}
            onChange={(event) => set("admissionNumber", event.target.value)}
          />
        </Field>
        <Field id="student-name" label="Name">
          <input id="student-name" required value={value.name} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <Field id="student-dob" label="Date of birth">
          <input
            id="student-dob"
            type="date"
            required
            value={value.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
        </Field>
        <Field id="student-gender" label="Gender">
          <select id="student-gender" value={value.gender} onChange={(event) => set("gender", event.target.value as StudentInput["gender"])}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field id="student-section" label="Section">
          <select
            id="student-section"
            value={value.section}
            onChange={(event) => set("section", event.target.value as StudentInput["section"])}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </Field>
        <Field id="expected-fees" label="Expected fees">
          <input
            id="expected-fees"
            inputMode="decimal"
            required
            value={value.expectedFees}
            onChange={(event) => set("expectedFees", event.target.value)}
          />
        </Field>
        <Field id="guardian-name" label="Guardian name">
          <input
            id="guardian-name"
            required
            value={value.guardianName}
            onChange={(event) => set("guardianName", event.target.value)}
          />
        </Field>
        <Field id="guardian-phone" label="Guardian phone">
          <input
            id="guardian-phone"
            type="tel"
            required
            value={value.guardianPhone}
            onChange={(event) => set("guardianPhone", event.target.value)}
          />
        </Field>
        <Field id="guardian-email" label="Guardian email">
          <input
            id="guardian-email"
            type="email"
            required
            value={value.guardianEmail}
            onChange={(event) => set("guardianEmail", event.target.value)}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="micro">&gt; Second contact, optional</legend>
        <div className="form-grid">
          <Field id="second-name" label="Name">
            <input
              id="second-name"
              value={value.secondContactName}
              onChange={(event) => set("secondContactName", event.target.value)}
            />
          </Field>
          <Field id="second-phone" label="Phone">
            <input
              id="second-phone"
              type="tel"
              value={value.secondContactPhone}
              onChange={(event) => set("secondContactPhone", event.target.value)}
            />
          </Field>
          <Field id="second-email" label="Email">
            <input
              id="second-email"
              type="email"
              value={value.secondContactEmail}
              onChange={(event) => set("secondContactEmail", event.target.value)}
            />
          </Field>
        </div>
      </fieldset>
      <button type="submit" className="solid" disabled={busy}>
        {busy ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
