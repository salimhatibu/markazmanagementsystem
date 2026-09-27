import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatMoney, formatPercent, formatShortDate, label, monthName } from "./format";
import {
  BLESSING,
  LATE_ARRIVAL_DEDUCTION,
  PAYMENT_LEAD,
  applicantName,
  payoutPhone,
  type Letterhead,
} from "./letterhead";
import { fromCents } from "./ledger";

export type FeeReceiptLine = {
  studentName: string;
  admissionNumber: string;
  section: "morning" | "evening";
  mpesaRef: string;
  amountCents: number;
  paidOn: string;
};

export type SalaryLine = {
  name: string;
  phone: string;
  nationalId: string;
  mpesaName?: string;
  mpesaNumber?: string;
  section: "morning" | "evening" | "both";
  salaryCents: number;
  mpesaRef?: string;
  paidOn?: string;
};

export type ReportStudent = {
  admissionNumber: string;
  name: string;
  age: number;
  gender: string;
  section: "morning" | "evening";
  expectedCents: number;
  paidCents: number;
  balanceCents: number;
  outstandingCents: number;
  percentPaid: number;
  guardianName: string;
};

export type ReportTeacher = {
  name: string;
  section: "morning" | "evening" | "both";
  phone?: string;
  nationalId?: string;
  expectedCents: number;
  paidCents: number;
  balanceCents: number;
  expectedReleaseDate: string;
  paidInAdvance: boolean;
};

export type OperationsReport = {
  markazName: string;
  letterhead?: Letterhead;
  currencySymbol: string | null;
  period: "biweekly" | "monthly";
  rangeStart: string;
  rangeEnd: string;
  generatedAt: string;
  feesCollectedCents: number;
  inHandCents: number;
  spentCents: number;
  outstandingCents: number;
  feesInPeriodCents: number;
  salariesInPeriodCents: number;
  expensesInPeriodCents?: number;
  feeLines?: FeeReceiptLine[];
  salaryLines?: SalaryLine[];
  students: ReportStudent[];
  teachers: ReportTeacher[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

function money(cents: number, symbol: string | null): string {
  return formatMoney(fromCents(cents), symbol);
}

export async function buildOperationsPdf(report: OperationsReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const black = rgb(0, 0, 0);

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensure(height: number) {
    if (y - height < MARGIN) newPage();
  }

  function draw(
    text: string,
    options: { size?: number; font?: PDFFont; gap?: number } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const gap = options.gap ?? 4;
    const lines = wrap(text, font, size, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      ensure(size + gap);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color: black });
      y -= size + gap;
    }
  }

  function rule() {
    ensure(12);
    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.6,
      color: black,
    });
    y -= 10;
  }

  const head = report.letterhead;
  const month = monthName(report.rangeStart);
  draw((head?.markazName || report.markazName).toUpperCase(), { size: 13, font: bold, gap: 4 });
  if (head?.address) draw(head.address, { size: 10, gap: 10 });
  draw(`${month.toUpperCase()} REPORT`, { size: 16, font: bold, gap: 4 });
  draw(formatShortDate(report.rangeEnd), { size: 11, gap: 6 });
  draw(`${formatShortDate(report.rangeStart)} to ${formatShortDate(report.rangeEnd)}`, { size: 10, gap: 12 });
  rule();

  draw("FEES RECEIVED", { size: 13, font: bold, gap: 8 });
  drawFeeTable(report.feeLines ?? []);
  const received = report.feeLines?.reduce((sum, line) => sum + line.amountCents, 0) ?? report.feesInPeriodCents;
  draw(
    `By the end of ${month} this amount of money has entered the account.`,
    { size: 11, gap: 10 },
  );
  draw(`Total amount received    ${money(received, report.currencySymbol)}`, { size: 13, font: bold, gap: 12 });
  rule();

  draw(`TEACHERS' SALARY (${month.toUpperCase()})`, { size: 13, font: bold, gap: 8 });
  drawSalaryTable(report.salaryLines ?? []);
  draw(
    `NB: For each day's late arrival, Ksh ${LATE_ARRIVAL_DEDUCTION} is deducted from the salary.`,
    { size: 9, gap: 10 },
  );
  rule();

  draw("Also this period", { size: 13, font: bold, gap: 8 });
  draw(`Salaries paid    ${money(report.salariesInPeriodCents, report.currencySymbol)}`, { size: 11 });
  draw(`Expenses    ${money(report.expensesInPeriodCents ?? 0, report.currencySymbol)}`, { size: 11 });
  draw(`Still in the office    ${money(report.inHandCents, report.currencySymbol)}`, { size: 11 });
  draw(`Still owed    ${money(report.outstandingCents, report.currencySymbol)}`, { size: 11, gap: 10 });
  rule();

  draw("MORNING STUDENTS", { size: 13, font: bold, gap: 8 });
  writeRoster(report.students.filter((student) => student.section === "morning"));
  rule();
  draw("EVENING STUDENTS", { size: 13, font: bold, gap: 8 });
  writeRoster(report.students.filter((student) => student.section === "evening"));
  rule();

  draw("TEACHERS", { size: 13, font: bold, gap: 8 });
  if (report.teachers.length === 0) {
    draw("None recorded.", { size: 10 });
  }
  for (const teacher of report.teachers) {
    draw(
      `${teacher.name}  ·  ${teacher.section}  ·  release ${teacher.expectedReleaseDate}  ·  ${
        teacher.paidInAdvance ? "paid in advance" : "not paid in advance"
      }`,
      { size: 10, font: bold, gap: 2 },
    );
    draw(
      `> SALARY ${money(teacher.expectedCents, report.currencySymbol)}  PAID ${money(teacher.paidCents, report.currencySymbol)}  REMAINING ${money(teacher.balanceCents, report.currencySymbol)}`,
      { size: 9, font: mono, gap: 8 },
    );
  }
  rule();

  draw("UNPAID STUDENT BALANCES", { size: 13, font: bold, gap: 8 });
  const unpaid = report.students.filter((student) => student.outstandingCents > 0);
  if (unpaid.length === 0) {
    draw("No outstanding balances.", { size: 10 });
  }
  for (const student of unpaid) {
    draw(
      `${student.admissionNumber}  ${student.name}  ${student.section}  owed ${money(student.outstandingCents, report.currencySymbol)}`,
      { size: 10, gap: 3 },
    );
  }
  rule();

  draw("SALARY DUE DATES", { size: 13, font: bold, gap: 8 });
  if (report.teachers.length === 0) {
    draw("No teachers recorded.", { size: 10 });
  }
  for (const teacher of report.teachers) {
    draw(
      `${teacher.name}  ·  release ${teacher.expectedReleaseDate}  ·  ${
        teacher.paidInAdvance ? "paid in advance" : "not paid in advance"
      }  ·  remaining ${money(teacher.balanceCents, report.currencySymbol)}`,
      { size: 10, gap: 3 },
    );
  }

  if (head) {
    draw("TRUSTEES AND PAYBILL", { size: 13, font: bold, gap: 6 });
    draw(PAYMENT_LEAD, { size: 10, gap: 4 });
    draw(head.accountName, { size: 10, font: bold, gap: 2 });
    draw(head.bankName, { size: 10, gap: 2 });
    draw(`Paybill ${head.paybill}`, { size: 10, gap: 2 });
    draw(`Account ${head.accountNumber}`, { size: 10, gap: 10 });
    rule();
  }

  draw("Open running balances. Outstanding ignores overpayment.", {
    size: 8,
    font: mono,
    gap: 8,
  });
  draw(BLESSING, { size: 11, font: bold, gap: 2 });

  const bytes = await pdf.save();
  return bytes;

  function drawFeeTable(lines: FeeReceiptLine[]) {
    const cols = [MARGIN, MARGIN + 22, MARGIN + 148, MARGIN + 210, MARGIN + 330, MARGIN + 430];
    const rowH = 16;
    function cell(text: string, col: number, font: PDFFont, size: number) {
      const clipped = text.length > 22 ? `${text.slice(0, 21)}…` : text;
      page.drawText(clipped, { x: cols[col], y: y - 11, size, font, color: black });
    }
    ensure(rowH + 6);
    cell("#", 0, bold, 8);
    cell("Student", 1, bold, 8);
    cell("Section", 2, bold, 8);
    cell("M-Pesa ref no", 3, bold, 8);
    cell("Amount", 4, bold, 8);
    cell("Date", 5, bold, 8);
    y -= rowH;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: black,
    });
    y -= 4;
    if (lines.length === 0) {
      draw("No fees have entered the account in this period.", { size: 10, gap: 10 });
      return;
    }
    lines.forEach((line, index) => {
      ensure(rowH);
      cell(String(index + 1), 0, regular, 9);
      cell(line.studentName || line.admissionNumber || "—", 1, regular, 9);
      cell(label(line.section), 2, regular, 9);
      cell(line.mpesaRef || "—", 3, regular, 9);
      cell(money(line.amountCents, report.currencySymbol), 4, regular, 9);
      cell(formatShortDate(line.paidOn), 5, regular, 9);
      y -= rowH;
    });
    y -= 8;
  }

  function drawSalaryTable(lines: SalaryLine[]) {
    const cols = [MARGIN, MARGIN + 20, MARGIN + 118, MARGIN + 198, MARGIN + 268, MARGIN + 362, MARGIN + 430];
    const rowH = 16;
    function cell(text: string, col: number, font: PDFFont, size: number, max = 16) {
      const clipped = text.length > max ? `${text.slice(0, max - 1)}…` : text;
      page.drawText(clipped, { x: cols[col], y: y - 11, size, font, color: black });
    }
    ensure(rowH + 6);
    cell("No.", 0, bold, 8, 6);
    cell("Name", 1, bold, 8, 14);
    cell("Phone", 2, bold, 8, 12);
    cell("ID number", 3, bold, 8, 12);
    cell("M-Pesa ref no", 4, bold, 8, 16);
    cell("Date", 5, bold, 8, 10);
    cell("Salary", 6, bold, 8, 12);
    y -= rowH;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: black,
    });
    y -= 4;
    if (lines.length === 0) {
      draw("No teachers recorded.", { size: 10, gap: 10 });
      return;
    }
    lines.forEach((line, index) => {
      ensure(rowH);
      cell(String(index + 1), 0, regular, 8, 6);
      cell(applicantName(line.name, line.mpesaName), 1, regular, 8, 14);
      cell(payoutPhone(line.phone, line.mpesaNumber) || "—", 2, regular, 8, 12);
      cell(line.nationalId || "—", 3, regular, 8, 12);
      cell(line.mpesaRef || "—", 4, regular, 8, 14);
      cell(line.paidOn ? formatShortDate(line.paidOn) : "—", 5, regular, 8, 10);
      cell(money(line.salaryCents, report.currencySymbol), 6, regular, 8, 12);
      y -= rowH;
    });
    y -= 8;
  }

  function writeRoster(students: ReportStudent[]) {
    if (students.length === 0) {
      draw("None recorded.", { size: 10 });
      return;
    }
    for (const student of students) {
      draw(
        `${student.admissionNumber}  ${student.name}  age ${student.age}  ${label(student.gender)}`,
        { size: 10, font: bold, gap: 2 },
      );
      draw(
        `> EXPECTED ${money(student.expectedCents, report.currencySymbol)}  PAID ${money(student.paidCents, report.currencySymbol)}  BALANCE ${money(student.balanceCents, report.currencySymbol)}  ${formatPercent(student.percentPaid)}  guardian ${student.guardianName}`,
        { size: 8, font: mono, gap: 7 },
      );
    }
  }
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
