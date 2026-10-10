import { eatDate } from "../shared/format";

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
  classId?: number | null;
  className?: string | null;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  section: StudentSection;
  expectedFees: number;
  admittedOn: string;
  admissionFeeCollected: boolean;
  admissionFeeAmount: number;
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
  dateOfBirth: string | null;
  age: number | null;
  gender: Gender;
  section: TeacherSection;
  phone: string | null;
  nationalId: string | null;
  mpesaName: string | null;
  mpesaNumber: string | null;
  expectedSalary: number;
  paid: number;
  balance: number;
  expectedReleaseDate: string | null;
  paidInAdvance: boolean;
  payments: Payment[];
};

export type Class = {
  id: number;
  name: string;
  section: StudentSection;
  students: number;
  teacherIds: number[];
  teacherNames: string[];
};

export type ClassAssignment = Student;

export type ClassInput = Pick<Class, "name" | "section" | "teacherIds">;

export type KharajahLeaver = {
  id: number;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  section: StudentSection;
  expectedFees: number;
  admittedOn: string;
  admissionFeeCollected: boolean;
  admissionFeeAmount: number;
  feesPaid: number;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  secondContactName: string | null;
  secondContactPhone: string | null;
  secondContactEmail: string | null;
  leftOn: string;
  leaveReason: string;
  notes: string | null;
  createdAt: string;
};

export type Settings = {
  markazName: string | null;
  currencySymbol: string | null;
  address: string | null;
  accountName: string | null;
  bankName: string | null;
  paybill: string | null;
  accountNumber: string | null;
};

export type DashboardTotals = {
  morningStudents: number;
  eveningStudents: number;
  teachers: number;
  morningTeachers: number;
  eveningTeachers: number;
  feesCollected: number;
  inHand: number;
  spent: number;
  salariesPaid: number;
  expenses: number;
  outstanding: number;
  booksStart?: string;
  booksEnd?: string;
};

export type Expense = {
  id: number;
  reason: string;
  amount: number;
  details: string | null;
  spentOn: string;
  createdAt: string;
};

export type TripEntryKind = "in" | "out";

export type TripEntry = {
  id: number;
  tripId: number;
  description: string;
  quantity: string | null;
  amount: number;
  kind: TripEntryKind;
  entryOn: string;
  notes: string | null;
  createdAt: string;
};

export type TripSummary = {
  id: number;
  title: string;
  notes: string | null;
  received: number;
  spent: number;
  balance: number;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TripDetail = TripSummary & {
  entries: TripEntry[];
};

export type BookPurchase = {
  id: number;
  name: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  purchasedOn: string;
  expenseId: number | null;
  createdAt: string;
};

export type BookInventoryItem = {
  id: number;
  name: string;
  price: number;
  sortOrder: number;
};

export type BookInventory = {
  id: number;
  title: string;
  purchasedOn: string;
  stationeriesNote: string | null;
  stationeriesCost: number | null;
  items: BookInventoryItem[];
  booksTotal: number;
  totalCost: number;
  expenseId: number | null;
  createdAt: string;
};

export type FeedbackTicket = {
  id: number;
  kind: "query" | "suggestion";
  body: string;
  done: boolean;
  doneAt: string | null;
  cancelled: boolean;
  cancelledAt: string | null;
  createdAt: string;
};

export type BlogVisibility = "public" | "private";

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverKey: string | null;
  coverUrl: string | null;
  bodyHtml: string;
  seriesId: number | null;
  seriesSlug: string | null;
  seriesTitle: string | null;
  published: boolean;
  publishedAt: string | null;
  visibility: BlogVisibility;
  fontFamily: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogSeries = {
  id: number;
  slug: string;
  title: string;
  blurb: string;
  publishedCount?: number;
};

export type BlogPostInput = {
  title: string;
  bodyHtml: string;
  excerpt?: string;
  coverKey?: string | null;
  seriesId?: number | null;
  published?: boolean;
  visibility?: BlogVisibility;
  fontFamily?: string | null;
};

export type BlogComment = {
  id: number;
  body: string;
  createdAt: string;
};

export type FeelingMood = "good" | "down";

export type FeelingEntry = {
  id: number;
  mood: FeelingMood;
  note: string;
  createdAt: string;
};

export type PanicAlert = {
  id: number;
  email: string;
  level: number;
  note: string;
  createdAt: string;
};

export type BlogPostStat = {
  id: number;
  slug: string;
  title: string;
  published: boolean;
  views: number;
  uniqueReaders: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgDwellMs: number;
  bounceRate: number;
  totalDwellMs: number;
  color: string;
};

export type BlogAnalytics = {
  totals: {
    views: number;
    uniqueReaders: number;
    impressions: number;
    clicks: number;
    ctr: number;
    avgDwellMs: number;
    totalDwellMs: number;
    postsPublished: number;
    drafts: number;
  };
  posts: BlogPostStat[];
  recent: { kind: string; title: string; dwellMs: number | null; at: string }[];
};

export type ReportItem = {
  id: number;
  period: "biweekly" | "monthly";
  section: "all" | StudentSection;
  rangeStart: string;
  rangeEnd: string;
  createdAt: string;
};

export type ReceiptScope = "current" | "monthly" | "biweekly";

export type FeeReceiptPreview = {
  scope: ReceiptScope;
  section: "all" | StudentSection;
  rangeStart: string;
  rangeEnd: string;
  title: string;
  preparedOn: string;
  monthName: string;
  currencySymbol: string;
  letterhead: {
    markazName: string;
    address: string;
    accountName: string;
    bankName: string;
    paybill: string;
    accountNumber: string;
  };
  lines: {
    studentName: string;
    admissionNumber: string;
    section: StudentSection;
    mpesaRef: string;
    amount: number;
    paidOn: string;
  }[];
  salaries: {
    name: string;
    phone: string;
    nationalId: string;
    mpesaName: string;
    mpesaNumber: string;
    section: TeacherSection;
    salary: number;
    mpesaRef: string;
    paidOn: string;
  }[];
  totalReceived: number;
  totalSalaries: number;
  summary: string;
};

export type StudentInput = {
  classId: number | null;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  admittedOn: string;
  gender: Gender;
  section: StudentSection;
  expectedFees: string;
  admissionFeeCollected: boolean;
  admissionFeeAmount: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  secondContactName: string;
  secondContactPhone: string;
  secondContactEmail: string;
};

export type TeacherInput = {
  name: string;
  gender: Gender;
  section: TeacherSection;
  phone: string;
  nationalId: string;
  mpesaName: string;
  mpesaNumber: string;
  expectedSalary: string;
  paidInAdvance: boolean;
};

export const emptyStudent = (): StudentInput => ({
  classId: null,
  admissionNumber: "",
  name: "",
  dateOfBirth: "",
  admittedOn: eatDate(),
  gender: "female",
  section: "morning",
  expectedFees: "",
  admissionFeeCollected: false,
  admissionFeeAmount: "3000",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  secondContactName: "",
  secondContactPhone: "",
  secondContactEmail: "",
});

export const emptyTeacher = (): TeacherInput => ({
  name: "",
  gender: "female",
  section: "morning",
  phone: "",
  nationalId: "",
  mpesaName: "",
  mpesaNumber: "",
  expectedSalary: "",
  paidInAdvance: false,
});

export const emptyClass = (): ClassInput => ({ name: "", section: "morning", teacherIds: [] });

export function studentToInput(student: Student): StudentInput {
  return {
    classId: student.classId ?? null,
    admissionNumber: student.admissionNumber,
    name: student.name,
    dateOfBirth: student.dateOfBirth,
    admittedOn: student.admittedOn || eatDate(),
    gender: student.gender,
    section: student.section,
    expectedFees: String(student.expectedFees),
    admissionFeeCollected: student.admissionFeeCollected,
    admissionFeeAmount: String(student.admissionFeeAmount),
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
    gender: teacher.gender,
    section: teacher.section,
    phone: teacher.phone ?? "",
    nationalId: teacher.nationalId ?? "",
    mpesaName: teacher.mpesaName ?? "",
    mpesaNumber: teacher.mpesaNumber ?? "",
    expectedSalary: String(teacher.expectedSalary),
    paidInAdvance: teacher.paidInAdvance,
  };
}
