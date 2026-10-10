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
      <p className="form-section">About the teacher</p>
      <div className="form-grid">
        <Field id="teacher-name" label="Full name">
          <input
            id="teacher-name"
            required
            autoComplete="name"
            placeholder="Khadija Omar"
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
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
        <Field id="teacher-section" label="Class time">
          <select
            id="teacher-section"
            value={value.section}
            onChange={(event) => set("section", event.target.value as TeacherInput["section"])}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="both">Morning and evening</option>
          </select>
        </Field>
        <Field id="teacher-phone" label="Phone number">
          <input
            id="teacher-phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 000 000"
            value={value.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
        </Field>
        <Field id="teacher-id" label="ID number">
          <input
            id="teacher-id"
            placeholder="National ID"
            value={value.nationalId}
            onChange={(event) => set("nationalId", event.target.value)}
          />
        </Field>
        <Field id="mpesa-name" label="M-Pesa name" hint="The name on the phone that receives salary.">
          <input
            id="mpesa-name"
            placeholder="Fahima"
            value={value.mpesaName}
            onChange={(event) => set("mpesaName", event.target.value)}
          />
        </Field>
        <Field id="mpesa-number" label="M-Pesa number">
          <input
            id="mpesa-number"
            inputMode="tel"
            placeholder="0712 000 000"
            value={value.mpesaNumber}
            onChange={(event) => set("mpesaNumber", event.target.value)}
          />
        </Field>
        <Field
          id="expected-salary"
          label="Salary"
          hint="Kenyan shillings. Late arrival deducts Ksh 100 a day from this amount."
        >
          <input
            id="expected-salary"
            inputMode="decimal"
            required
            placeholder="0.00"
            aria-describedby="expected-salary-hint"
            value={value.expectedSalary}
            onChange={(event) => set("expectedSalary", event.target.value)}
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
        <span>Already paid in advance</span>
      </label>
      <button type="submit" className="solid" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
