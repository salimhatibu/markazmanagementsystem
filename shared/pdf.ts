import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatMoney, formatPercent, label } from "./format";
import { fromCents } from "./ledger";

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
  expectedCents: number;
  paidCents: number;
  balanceCents: number;
  expectedReleaseDate: string;
  paidInAdvance: boolean;
};

export type OperationsReport = {
  markazName: string;
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

  const title = report.markazName.trim() || "Markaz";
  draw(title.toUpperCase(), { size: 22, font: bold, gap: 6 });
  draw("OPERATIONS REPORT", { size: 14, font: bold, gap: 8 });
  draw(`> PERIOD  ${report.period.toUpperCase()}`, { size: 9, font: mono });
  draw(`> RANGE  ${report.rangeStart}  TO  ${report.rangeEnd}`, { size: 9, font: mono });
  draw(`> GENERATED  ${report.generatedAt}`, { size: 9, font: mono, gap: 8 });
  rule();

  draw("FINANCE", { size: 13, font: bold, gap: 8 });
  draw(`> COLLECTED  ${money(report.feesCollectedCents, report.currencySymbol)}`, { font: mono });
  draw(`> IN_HAND  ${money(report.inHandCents, report.currencySymbol)}`, { font: mono });
  draw(`> SPENT  ${money(report.spentCents, report.currencySymbol)}`, { font: mono });
  draw(`> OUTSTANDING  ${money(report.outstandingCents, report.currencySymbol)}`, { font: mono });
  draw(
    `> FEES_IN_PERIOD  ${money(report.feesInPeriodCents, report.currencySymbol)}`,
    { font: mono },
  );
  draw(
    `> SALARIES_IN_PERIOD  ${money(report.salariesInPeriodCents, report.currencySymbol)}`,
    { font: mono, gap: 8 },
  );
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

  draw("Open running balances. Outstanding ignores overpayment.", {
    size: 8,
    font: mono,
    gap: 2,
  });

  const bytes = await pdf.save();
  return bytes;

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
