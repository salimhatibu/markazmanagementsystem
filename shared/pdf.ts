import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from "pdf-lib";
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
import { loadPdfFonts } from "./pdf-fonts";

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
const FOOTER = 48;
const CONTENT = PAGE_WIDTH - MARGIN * 2;

const C = {
  paper: hex("#f6eef2"),
  blush: hex("#f3eef1"),
  wash: hex("#eadfe6"),
  header: hex("#f0d4de"),
  card: hex("#ffffff"),
  ink: hex("#0a0a0c"),
  text2: hex("#2b2b30"),
  mute: hex("#74747c"),
  accent: hex("#c76a8c"),
  pink: hex("#e7a3b8"),
  green: hex("#1f8a4c"),
};

function hex(value: string): RGB {
  const n = value.replace("#", "");
  return rgb(
    parseInt(n.slice(0, 2), 16) / 255,
    parseInt(n.slice(2, 4), 16) / 255,
    parseInt(n.slice(4, 6), 16) / 255,
  );
}

function money(cents: number, symbol: string | null): string {
  return formatMoney(fromCents(cents), symbol);
}

function figures(cents: number): string {
  return fromCents(cents).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function buildOperationsPdf(report: OperationsReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const head = report.letterhead;
  const month = monthName(report.rangeStart);
  const title = `${month} report`;
  const markaz = head?.markazName || report.markazName;
  pdf.setTitle(`${month} report — ${markaz}`);
  pdf.setAuthor(markaz);
  pdf.setCreator("Markaz Imam ash-Shafi'i");

  let display: PDFFont;
  let body: PDFFont;
  let bodyBold: PDFFont;
  let nums: PDFFont;
  try {
    const files = loadPdfFonts();
    display = await pdf.embedFont(files.display, { subset: true });
    body = await pdf.embedFont(files.body, { subset: true });
    bodyBold = await pdf.embedFont(files.bodyBold, { subset: true });
    nums = await pdf.embedFont(files.nums, { subset: true });
  } catch {
    display = await pdf.embedFont(StandardFonts.TimesRomanBold);
    body = await pdf.embedFont(StandardFonts.Helvetica);
    bodyBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    nums = await pdf.embedFont(StandardFonts.Helvetica);
  }

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 22;

  paint();
  drawCover();

  section("Fees received");
  note("Amounts in KES");
  drawTable(
    [
      { label: "#", width: 24 },
      { label: "Student", width: 140 },
      { label: "Section", width: 64 },
      { label: "M-Pesa ref", width: 100 },
      { label: "Amount", width: 78, align: "right", font: "nums" },
      { label: "Date", width: 52, align: "right" },
    ],
    (report.feeLines ?? []).map((line, index) => [
      String(index + 1),
      line.studentName || line.admissionNumber || "—",
      label(line.section),
      line.mpesaRef || "—",
      figures(line.amountCents),
      formatShortDate(line.paidOn),
    ]),
    "No fees have entered the account in this period.",
  );
  prose(`By the end of ${month} this amount of money has entered the account.`);
  totalCard(
    "Total amount received",
    money(
      report.feeLines?.reduce((sum, line) => sum + line.amountCents, 0) ?? report.feesInPeriodCents,
      report.currencySymbol,
    ),
  );

  section(`Teachers' salary (${month})`);
  note("Amounts in KES");
  drawTable(
    [
      { label: "#", width: 24 },
      { label: "Name", width: 118 },
      { label: "Phone", width: 78 },
      { label: "ID number", width: 70 },
      { label: "M-Pesa ref", width: 88 },
      { label: "Date", width: 50, align: "right" },
      { label: "Salary", width: 70, align: "right", font: "nums" },
    ],
    (report.salaryLines ?? []).map((line, index) => [
      String(index + 1),
      applicantName(line.name, line.mpesaName),
      payoutPhone(line.phone, line.mpesaNumber) || "—",
      line.nationalId || "—",
      line.mpesaRef || "—",
      line.paidOn ? formatShortDate(line.paidOn) : "—",
      figures(line.salaryCents),
    ]),
    "No teachers recorded.",
  );
  prose(`NB: For each day's late arrival, Ksh ${LATE_ARRIVAL_DEDUCTION} is deducted from the salary.`);

  section("Also this period");
  drawStats([
    { label: "Salaries paid", value: money(report.salariesInPeriodCents, report.currencySymbol), tone: "green" },
    { label: "Expenses", value: money(report.expensesInPeriodCents ?? 0, report.currencySymbol), tone: "pink" },
    { label: "Still in the office", value: money(report.inHandCents, report.currencySymbol), tone: "green" },
    { label: "Still owed", value: money(report.outstandingCents, report.currencySymbol), tone: "pink" },
  ]);

  section("Morning students");
  writeRoster(report.students.filter((student) => student.section === "morning"));
  section("Evening students");
  writeRoster(report.students.filter((student) => student.section === "evening"));

  section("Teachers");
  drawTable(
    [
      { label: "Name", width: 130 },
      { label: "Section", width: 60 },
      { label: "Release", width: 68 },
      { label: "Advance", width: 86 },
      { label: "Salary", width: 72, align: "right", font: "nums" },
      { label: "Paid", width: 68, align: "right", font: "nums" },
    ],
    report.teachers.map((teacher) => [
      teacher.name,
      label(teacher.section),
      formatShortDate(teacher.expectedReleaseDate),
      teacher.paidInAdvance ? "Paid in advance" : "Not in advance",
      figures(teacher.expectedCents),
      figures(teacher.paidCents),
    ]),
    "None recorded.",
  );

  section("Unpaid student balances");
  drawTable(
    [
      { label: "Adm.", width: 56 },
      { label: "Student", width: 176 },
      { label: "Section", width: 80 },
      { label: "Owed", width: 120, align: "right", font: "nums" },
    ],
    report.students
      .filter((student) => student.outstandingCents > 0)
      .map((student) => [
        student.admissionNumber,
        student.name,
        label(student.section),
        figures(student.outstandingCents),
      ]),
    "No outstanding balances.",
  );

  section("Salary due dates");
  drawTable(
    [
      { label: "Name", width: 168 },
      { label: "Release", width: 92 },
      { label: "Status", width: 116 },
      { label: "Remaining", width: 108, align: "right", font: "nums" },
    ],
    report.teachers.map((teacher) => [
      teacher.name,
      formatShortDate(teacher.expectedReleaseDate),
      teacher.paidInAdvance ? "Paid in advance" : "Not in advance",
      figures(teacher.balanceCents),
    ]),
    "No teachers recorded.",
  );

  if (head) {
    section("Trustees and paybill", 130);
    drawBank(head);
  }

  prose("Open running balances. Outstanding ignores overpayment.");
  ensure(40);
  write(BLESSING, PAGE_WIDTH / 2, y - 14, 14, display, C.accent, undefined, "center");

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    const current = page;
    page = item;
    write(`Markaz Imam ash-Shafi'i    ${index + 1} / ${pages.length}`, PAGE_WIDTH / 2, 18, 8, body, C.mute, undefined, "center");
    page = current;
  });

  return pdf.save();

  function paint() {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: C.paper });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: C.accent });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 11, width: PAGE_WIDTH, height: 3, color: C.green });
    const cx = PAGE_WIDTH / 2;
    const cy = PAGE_HEIGHT / 2 + 30;
    page.drawCircle({ x: cx, y: cy, size: 78, borderColor: C.pink, borderWidth: 0.7, borderOpacity: 0.2, opacity: 0 });
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 36, color: C.wash });
    page.drawRectangle({ x: 0, y: 36, width: PAGE_WIDTH, height: 2.2, color: C.pink });
  }

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    paint();
    y = PAGE_HEIGHT - 26;
    write(`${title}  ·  continued`, MARGIN, y - 10, 10, display, C.mute);
    y -= 24;
  }

  function ensure(height: number) {
    if (y - height < FOOTER) newPage();
  }

  function fontFor(kind?: "body" | "bold" | "nums" | "display"): PDFFont {
    if (kind === "bold") return bodyBold;
    if (kind === "nums") return nums;
    if (kind === "display") return display;
    return body;
  }

  function gapFor(font: PDFFont, size: number): number {
    return Math.max(font.widthOfTextAtSize(" ", size), size * 0.36);
  }

  function wordsOf(value: string): string[] {
    return value.split(/\s+/).filter((part) => part.length > 0);
  }

  function lineWidth(words: string[], font: PDFFont, size: number): number {
    const gap = gapFor(font, size);
    return words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, size), 0) + gap * Math.max(0, words.length - 1);
  }

  function fit(value: string, font: PDFFont, size: number, width: number): string[] {
    const words = wordsOf(value);
    if (lineWidth(words, font, size) <= width) return words;
    const ell = "...";
    const kept: string[] = [];
    for (const word of words) {
      const next = [...kept, word];
      if (lineWidth([...next, ell], font, size) <= width) kept.push(word);
      else break;
    }
    if (kept.length === 0) {
      const budget = Math.max(width - font.widthOfTextAtSize(ell, size), 8);
      let cut = words[0] ?? "";
      while (cut.length > 1 && font.widthOfTextAtSize(cut, size) > budget) cut = cut.slice(0, -1);
      return [`${cut}${ell}`];
    }
    return [...kept, ell];
  }

  function write(
    value: string,
    x: number,
    baseline: number,
    size: number,
    font: PDFFont,
    color: RGB,
    width?: number,
    align: "left" | "right" | "center" = "left",
  ) {
    const words = width ? fit(value, font, size, width) : wordsOf(value);
    const gap = gapFor(font, size);
    const total = lineWidth(words, font, size);
    let left = x;
    if (align === "right" && width) left = x + width - total;
    if (align === "center") left = width ? x + (width - total) / 2 : x - total / 2;
    for (const word of words) {
      page.drawText(word, { x: left, y: baseline, size, font, color });
      left += font.widthOfTextAtSize(word, size) + gap;
    }
  }

  function motif(cx: number, cy: number) {
    page.drawCircle({ x: cx - 11, y: cy, size: 3.2, color: C.green });
    page.drawCircle({ x: cx, y: cy, size: 5.4, color: C.accent });
    page.drawCircle({ x: cx + 11, y: cy, size: 3.2, color: C.green });
  }

  function drawCover() {
    y = PAGE_HEIGHT - 36;
    motif(PAGE_WIDTH / 2, y - 10);
    y -= 32;
    const nameSize = 11;
    const lines = wrap(markaz.toUpperCase(), display, nameSize, CONTENT - 24);
    for (const line of lines) {
      write(line, PAGE_WIDTH / 2, y - nameSize, nameSize, display, C.ink, undefined, "center");
      y -= nameSize + 4;
    }
    if (head?.address) {
      write(head.address, PAGE_WIDTH / 2, y - 9, 9, body, C.mute, undefined, "center");
      y -= 18;
    }
    y -= 8;
    write(title, PAGE_WIDTH / 2, y - 26, 28, display, C.ink, undefined, "center");
    y -= 38;
    write(formatShortDate(report.rangeEnd), PAGE_WIDTH / 2, y - 10, 10, body, C.mute, undefined, "center");
    y -= 16;
    write(
      `${formatShortDate(report.rangeStart)}  to  ${formatShortDate(report.rangeEnd)}`,
      PAGE_WIDTH / 2,
      y - 10,
      10,
      body,
      C.text2,
      undefined,
      "center",
    );
    y -= 28;
  }

  function section(titleText: string, reserve = 0) {
    ensure(40 + reserve);
    y -= 8;
    page.drawRectangle({ x: MARGIN, y: y - 12, width: 16, height: 2.2, color: C.green });
    write(titleText.toUpperCase(), MARGIN + 24, y - 15, 9, bodyBold, C.mute);
    y -= 26;
  }

  function note(value: string) {
    write(value, MARGIN, y - 9, 8, body, C.mute);
    y -= 14;
  }

  function prose(value: string) {
    const size = 9.5;
    const lines = wrap(value, body, size, CONTENT);
    for (const line of lines) {
      ensure(size + 6);
      write(line, MARGIN, y - size, size, body, C.text2);
      y -= size + 5;
    }
    y -= 6;
  }

  function card(x: number, top: number, width: number, height: number, tone: "green" | "pink" | "accent") {
    page.drawRectangle({
      x: x + 1.5,
      y: top - height - 1.5,
      width,
      height,
      color: C.wash,
    });
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      color: C.card,
      borderColor: C.pink,
      borderWidth: 1.2,
    });
    page.drawRectangle({
      x,
      y: top - 3.2,
      width,
      height: 3.2,
      color: tone === "green" ? C.green : tone === "pink" ? C.pink : C.accent,
    });
  }

  function totalCard(caption: string, amount: string) {
    const height = 54;
    ensure(height + 14);
    card(MARGIN, y, CONTENT, height, "green");
    write(caption, MARGIN + 18, y - 20, 9, body, C.mute);
    write(amount, MARGIN + 18, y - 42, 18, nums, C.ink);
    y -= height + 16;
  }

  function drawStats(items: { label: string; value: string; tone: "green" | "pink" }[]) {
    const gap = 12;
    const width = (CONTENT - gap) / 2;
    const height = 58;
    for (let i = 0; i < items.length; i += 2) {
      ensure(height + 12);
      items.slice(i, i + 2).forEach((item, col) => {
        const x = MARGIN + col * (width + gap);
        card(x, y, width, height, item.tone);
        write(item.label, x + 14, y - 20, 9, body, C.mute, width - 28);
        write(item.value, x + 14, y - 44, 14, nums, C.ink, width - 28);
      });
      y -= height + 12;
    }
    y -= 4;
  }

  function drawBank(letterhead: Letterhead) {
    const height = 126;
    ensure(height + 10);
    card(MARGIN, y, CONTENT, height, "green");
    write(PAYMENT_LEAD, MARGIN + 18, y - 24, 9, body, C.text2, CONTENT - 36);
    write(letterhead.accountName, MARGIN + 18, y - 50, 13, display, C.ink, CONTENT - 36);
    write(letterhead.bankName, MARGIN + 18, y - 70, 10, body, C.text2, CONTENT - 36);
    write(`Paybill  ${letterhead.paybill}`, MARGIN + 18, y - 90, 11, nums, C.ink, CONTENT - 36);
    write(`Account  ${letterhead.accountNumber}`, MARGIN + 18, y - 110, 11, nums, C.ink, CONTENT - 36);
    y -= height + 16;
  }

  function drawTable(
    cols: { label: string; width: number; align?: "left" | "right"; font?: "body" | "bold" | "nums" }[],
    rows: string[][],
    empty: string,
  ) {
    const headerH = 24;
    const rowH = 20;
    const inset = 8;
    const total = cols.reduce((sum, col) => sum + col.width, 0);
    const widths = cols.map((col) => (col.width / total) * CONTENT);

    function header() {
      ensure(headerH + rowH + 4);
      page.drawRectangle({ x: MARGIN, y: y - headerH, width: CONTENT, height: headerH, color: C.header });
      page.drawRectangle({ x: MARGIN, y: y - headerH, width: CONTENT, height: 1, color: C.pink });
      let x = MARGIN;
      cols.forEach((col, index) => {
        write(col.label, x + inset, y - 15, 8, bodyBold, C.ink, widths[index] - inset * 2, col.align ?? "left");
        x += widths[index];
      });
      y -= headerH;
    }

    header();
    if (rows.length === 0) {
      ensure(30);
      page.drawRectangle({ x: MARGIN, y: y - 28, width: CONTENT, height: 28, color: C.card });
      write(empty, MARGIN + inset, y - 18, 9, body, C.mute, CONTENT - inset * 2);
      y -= 40;
      return;
    }

    rows.forEach((row, rowIndex) => {
      if (y - rowH < FOOTER) {
        newPage();
        header();
      }
      page.drawRectangle({
        x: MARGIN,
        y: y - rowH,
        width: CONTENT,
        height: rowH,
        color: rowIndex % 2 === 0 ? C.card : C.blush,
      });
      let x = MARGIN;
      row.forEach((cell, index) => {
        const col = cols[index];
        write(cell, x + inset, y - 13, 9.2, fontFor(col.font), C.ink, widths[index] - inset * 2, col.align ?? "left");
        x += widths[index];
      });
      y -= rowH;
    });
    page.drawRectangle({ x: MARGIN, y, width: CONTENT, height: 1, color: C.wash });
    y -= 14;
  }

  function writeRoster(students: ReportStudent[]) {
    note("Amounts in KES");
    drawTable(
      [
        { label: "Adm.", width: 50 },
        { label: "Name", width: 118 },
        { label: "Expected", width: 72, align: "right", font: "nums" },
        { label: "Paid", width: 72, align: "right", font: "nums" },
        { label: "Balance", width: 72, align: "right", font: "nums" },
        { label: "%", width: 48, align: "right", font: "nums" },
        { label: "Guardian", width: 70 },
      ],
      students.map((student) => [
        student.admissionNumber,
        student.name,
        figures(student.expectedCents),
        figures(student.paidCents),
        figures(student.balanceCents),
        formatPercent(student.percentPaid),
        student.guardianName,
      ]),
      "None recorded.",
    );
  }
}

function spaceGap(font: PDFFont, size: number): number {
  return Math.max(font.widthOfTextAtSize(" ", size), size * 0.36);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter((part) => part.length > 0);
  const gap = spaceGap(font, size);
  const lines: string[] = [];
  let current: string[] = [];
  let currentWidth = 0;
  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, size);
    const nextWidth = current.length === 0 ? wordWidth : currentWidth + gap + wordWidth;
    if (nextWidth <= width || current.length === 0) {
      current.push(word);
      currentWidth = nextWidth;
    } else {
      lines.push(current.join(" "));
      current = [word];
      currentWidth = wordWidth;
    }
  }
  if (current.length) lines.push(current.join(" "));
  return lines.length > 0 ? lines : [""];
}
