export type Gender = "male" | "female";
export type StudentSection = "morning" | "evening";
export type TeacherSection = "morning" | "evening" | "both";

export type Payment = {
  id: number;
  amount: number;
  paidOn: string;
  note: string | null;
};

export type Student = {
  id: number;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  section: StudentSection;
  expectedFees: number;
  paid: number;
  balance: number;
  outstanding: number;
  percentPaid: number;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  secondContactName: string | null;
  secondContactPhone: string | null;
  secondContactEmail: string | null;
  payments: Payment[];
};

export type Teacher = {
  id: number;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  section: TeacherSection;
  expectedSalary: number;
  paid: number;
  balance: number;
  expectedReleaseDate: string;
  paidInAdvance: boolean;
  payments: Payment[];
};

export type Settings = {
  markazName: string | null;
  currencySymbol: string | null;
};

export type DashboardTotals = {
  morningStudents: number;
  eveningStudents: number;
  teachers: number;
  feesCollected: number;
  inHand: number;
  spent: number;
  salariesPaid: number;
  expenses: number;
  outstanding: number;
};

export type Expense = {
  id: number;
  reason: string;
  amount: number;
  details: string | null;
  spentOn: string;
  createdAt: string;
};

export type ReportItem = {
  id: number;
  period: "biweekly" | "monthly";
  rangeStart: string;
  rangeEnd: string;
  createdAt: string;
};

export type StudentInput = {
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  gender: Gender;
  section: StudentSection;
  expectedFees: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  secondContactName: string;
  secondContactPhone: string;
  secondContactEmail: string;
};

export type TeacherInput = {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  section: TeacherSection;
  expectedSalary: string;
  expectedReleaseDate: string;
  paidInAdvance: boolean;
};

export const emptyStudent = (): StudentInput => ({
  admissionNumber: "",
  name: "",
  dateOfBirth: "",
  gender: "female",
  section: "morning",
  expectedFees: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  secondContactName: "",
  secondContactPhone: "",
  secondContactEmail: "",
});

export const emptyTeacher = (): TeacherInput => ({
  name: "",
  dateOfBirth: "",
  gender: "female",
  section: "morning",
  expectedSalary: "",
  expectedReleaseDate: "",
  paidInAdvance: false,
});

export function studentToInput(student: Student): StudentInput {
  return {
    admissionNumber: student.admissionNumber,
    name: student.name,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    section: student.section,
    expectedFees: String(student.expectedFees),
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    guardianEmail: student.guardianEmail,
    secondContactName: student.secondContactName ?? "",
    secondContactPhone: student.secondContactPhone ?? "",
    secondContactEmail: student.secondContactEmail ?? "",
  };
}

export function teacherToInput(teacher: Teacher): TeacherInput {
  return {
    name: teacher.name,
    dateOfBirth: teacher.dateOfBirth,
    gender: teacher.gender,
    section: teacher.section,
    expectedSalary: String(teacher.expectedSalary),
    expectedReleaseDate: teacher.expectedReleaseDate,
    paidInAdvance: teacher.paidInAdvance,
  };
}
