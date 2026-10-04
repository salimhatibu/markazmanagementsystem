import { FormEvent } from "react";
import { EVENING_FEES, MORNING_FEES } from "../../shared/letterhead";
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

  function setSection(section: StudentInput["section"]) {
    const suggested = String(section === "evening" ? EVENING_FEES.admission : MORNING_FEES.admission);
    const previousDefault = String(
      value.section === "evening" ? EVENING_FEES.admission : MORNING_FEES.admission,
    );
    onChange({
      ...value,
      section,
      admissionFeeAmount:
        !value.admissionFeeAmount || value.admissionFeeAmount === previousDefault
          ? suggested
          : value.admissionFeeAmount,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  const admissionHint =
    value.section === "evening"
      ? `Evening admission is usually KES ${EVENING_FEES.admission.toLocaleString("en-GB")}.`
      : `Morning admission is usually KES ${MORNING_FEES.admission.toLocaleString("en-GB")}.`;

  return (
    <form className="record-form" onSubmit={submit}>
      <p className="form-section">About the student</p>
      <div className="form-grid">
        <Field id="admission" label="Admission number" hint="The number on the student file, such as 0000001.">
          <input
            id="admission"
            required
            autoComplete="off"
            placeholder="0000001"
            value={value.admissionNumber}
            onChange={(event) => set("admissionNumber", event.target.value)}
          />
        </Field>
        <Field id="student-name" label="Full name">
          <input
            id="student-name"
            required
            autoComplete="name"
            placeholder="Amina Hassan"
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>
        <Field id="student-dob" label="Date of birth">
          <input
            id="student-dob"
            type="date"
            required
            autoComplete="bday"
            value={value.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
        </Field>
        <Field id="admitted-on" label="Date of admission" hint="The day this student joined the markaz.">
          <input
            id="admitted-on"
            type="date"
            required
            value={value.admittedOn}
            onChange={(event) => set("admittedOn", event.target.value)}
          />
        </Field>
        <Field id="student-gender" label="Gender">
          <select
            id="student-gender"
            value={value.gender}
            onChange={(event) => set("gender", event.target.value as StudentInput["gender"])}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field id="student-section" label="Class time">
          <select
            id="student-section"
            value={value.section}
            onChange={(event) => setSection(event.target.value as StudentInput["section"])}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </Field>
        <Field
          id="expected-fees"
          label="Expected fees"
          hint="Morning is KES 15,000 a term. Evening is KES 9,000, or 10,000 for Hadhaanah. Admission is recorded separately below."
        >
          <input
            id="expected-fees"
            inputMode="decimal"
            required
            placeholder="0.00"
            aria-describedby="expected-fees-hint"
            value={value.expectedFees}
            onChange={(event) => set("expectedFees", event.target.value)}
          />
        </Field>
      </div>
      <p className="form-section">Admission fees</p>
      <div className="form-grid">
        <label className="check" htmlFor="admission-collected">
          <input
            id="admission-collected"
            type="checkbox"
            checked={value.admissionFeeCollected}
            onChange={(event) => set("admissionFeeCollected", event.target.checked)}
          />
          <span>
            Admission fees collected
            <em className="check-hint">{admissionHint}</em>
          </span>
        </label>
        <Field
          id="admission-amount"
          label="Admission fee amount"
          hint={
            value.admissionFeeCollected
              ? "This amount is recorded as a fee payment when you save."
              : "Tick the box above if admission has been paid."
          }
        >
          <input
            id="admission-amount"
            inputMode="decimal"
            required={value.admissionFeeCollected}
            placeholder="0.00"
            value={value.admissionFeeAmount}
            onChange={(event) => set("admissionFeeAmount", event.target.value)}
          />
        </Field>
      </div>
      <p className="form-section">Guardian</p>
      <div className="form-grid">
        <Field id="guardian-name" label="Guardian name">
          <input
            id="guardian-name"
            required
            autoComplete="name"
            placeholder="Hassan Ali"
            value={value.guardianName}
            onChange={(event) => set("guardianName", event.target.value)}
          />
        </Field>
        <Field id="guardian-phone" label="Guardian phone">
          <input
            id="guardian-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+254 7…"
            value={value.guardianPhone}
            onChange={(event) => set("guardianPhone", event.target.value)}
          />
        </Field>
        <Field id="guardian-email" label="Guardian email" hint="Used if you send a fee reminder.">
          <input
            id="guardian-email"
            type="email"
            required
            autoComplete="email"
            placeholder="guardian@email.com"
            aria-describedby="guardian-email-hint"
            value={value.guardianEmail}
            onChange={(event) => set("guardianEmail", event.target.value)}
          />
        </Field>
      </div>
      <fieldset>
        <legend>Another contact, if you have one</legend>
        <div className="form-grid">
          <Field id="second-name" label="Name">
            <input
              id="second-name"
              autoComplete="name"
              value={value.secondContactName}
              onChange={(event) => set("secondContactName", event.target.value)}
            />
          </Field>
          <Field id="second-phone" label="Phone">
            <input
              id="second-phone"
              type="tel"
              autoComplete="tel"
              value={value.secondContactPhone}
              onChange={(event) => set("secondContactPhone", event.target.value)}
            />
          </Field>
          <Field id="second-email" label="Email">
            <input
              id="second-email"
              type="email"
              autoComplete="email"
              value={value.secondContactEmail}
              onChange={(event) => set("secondContactEmail", event.target.value)}
            />
          </Field>
        </div>
      </fieldset>
      <button type="submit" className="solid" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
