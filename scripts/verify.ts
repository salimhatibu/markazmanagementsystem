import assert from "node:assert/strict";
import { formatShortDate, monthName } from "../shared/format";
import { applicantName, presentLetterhead, payoutPhone } from "../shared/letterhead";
import { biweeklyRange, monthlyRange, monthToDateRange } from "../shared/periods";
import {
  operationsTotals,
  studentFigures,
  teacherFigures,
  toCents,
} from "../shared/ledger";
import { buildOperationsPdf } from "../shared/pdf";

function student(expected: number, paid: number) {
  return studentFigures(toCents(expected), toCents(paid));
}

{
  const even = student(100, 40);
  assert.equal(even.balanceCents, 6000);
  assert.equal(even.outstandingCents, 6000);
  assert.equal(even.percentPaid, 40);
}

{
  const over = student(100, 120);
  assert.equal(over.balanceCents, -2000);
  assert.equal(over.outstandingCents, 0);
  assert.equal(over.percentPaid, 120);
}

{
  const zeroExpected = student(0, 10);
  assert.equal(zeroExpected.percentPaid, 0);
  assert.equal(zeroExpected.balanceCents, -1000);
  assert.equal(zeroExpected.outstandingCents, 0);
}

{
  const totals = operationsTotals(
    [
      { expectedCents: toCents(100), paidCents: toCents(40) },
      { expectedCents: toCents(50), paidCents: toCents(80) },
    ],
    [{ expectedCents: toCents(70), paidCents: toCents(30) }],
  );
  assert.equal(totals.feesCollectedCents, toCents(120));
  assert.equal(totals.spentCents, toCents(30));
  assert.equal(totals.inHandCents, toCents(90));
  assert.equal(totals.outstandingCents, toCents(60));
  assert.equal(totals.expensesCents, 0);
  assert.equal(teacherFigures(toCents(70), toCents(30)).balanceCents, toCents(40));
}

{
  const afterExpense = operationsTotals(
    [{ expectedCents: toCents(100), paidCents: toCents(100) }],
    [{ expectedCents: toCents(0), paidCents: toCents(10) }],
    toCents(25),
  );
  assert.equal(afterExpense.inHandCents, toCents(65));
  assert.equal(afterExpense.spentCents, toCents(35));
  assert.equal(afterExpense.expensesCents, toCents(25));
}

assert.deepEqual(biweeklyRange(new Date(Date.UTC(2026, 8, 15))), {
  start: "2026-09-01",
  end: "2026-09-14",
});
assert.deepEqual(biweeklyRange(new Date(Date.UTC(2026, 8, 1))), {
  start: "2026-08-16",
  end: "2026-08-31",
});
assert.deepEqual(biweeklyRange(new Date(Date.UTC(2026, 2, 1))), {
  start: "2026-02-16",
  end: "2026-02-28",
});
assert.deepEqual(biweeklyRange(new Date(Date.UTC(2024, 2, 1))), {
  start: "2024-02-16",
  end: "2024-02-29",
});
assert.deepEqual(monthlyRange(new Date(Date.UTC(2026, 8, 1))), {
  start: "2026-08-01",
  end: "2026-08-31",
});
assert.deepEqual(monthlyRange(new Date(Date.UTC(2026, 0, 15))), {
  start: "2025-12-01",
  end: "2025-12-31",
});
assert.deepEqual(monthToDateRange(new Date("2026-09-27T10:00:00+03:00")), {
  start: "2026-09-01",
  end: "2026-09-27",
});
assert.equal(applicantName("Khadija Omar", "Fahima"), "Khadija Omar (Fahima)");
assert.equal(payoutPhone("0711", "0712"), "0712");
assert.equal(presentLetterhead(null).paybill, "985050");
assert.equal(formatShortDate("2026-09-27"), "27/9/26");
assert.equal(formatShortDate("2026-09-06"), "6/9/26");
assert.equal(monthName("2026-09-01"), "September");

const pdf = await buildOperationsPdf({
  markazName: "",
  letterhead: {
    markazName: "MARKAZ AL-IMAAM ASH-SHAAFI'IY AL-ISLAAMIY",
    address: "P.O. Box 3011-80100 Mombasa, Kenya.",
    accountName: "AHLUL ATHAR REGISTERED TRUSTEES",
    bankName: "GULF AFRICAN BANK",
    paybill: "985050",
    accountNumber: "0700004102",
  },
  currencySymbol: null,
  period: "biweekly",
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-14",
  generatedAt: "2026-09-15T06:00:00.000Z",
  feesCollectedCents: 4000,
  inHandCents: 1000,
  spentCents: 3000,
  outstandingCents: 6000,
  feesInPeriodCents: 4000,
  salariesInPeriodCents: 3000,
  feeLines: [
    {
      studentName: "Amina Hassan",
      admissionNumber: "A-1",
      section: "morning",
      mpesaRef: "UD12ABC",
      amountCents: 6000000,
      paidOn: "2026-09-06",
    },
    {
      studentName: "Fatma Ali",
      admissionNumber: "A-2",
      section: "evening",
      mpesaRef: "",
      amountCents: 2100000,
      paidOn: "2026-09-10",
    },
  ],
  salaryLines: [
    {
      name: "Omar Ali",
      phone: "0712000000",
      nationalId: "12345678",
      mpesaName: "Fahima",
      mpesaNumber: "0712000000",
      section: "both",
      salaryCents: 2000000,
    },
  ],
  students: [
    {
      admissionNumber: "A-1",
      name: "Amina Hassan",
      age: 12,
      gender: "female",
      section: "morning",
      expectedCents: 10000,
      paidCents: 4000,
      balanceCents: 6000,
      outstandingCents: 6000,
      percentPaid: 40,
      guardianName: "Hassan",
    },
  ],
  teachers: [
    {
      name: "Omar Ali",
      section: "both",
      phone: "0712000000",
      nationalId: "12345678",
      expectedCents: 8000,
      paidCents: 3000,
      balanceCents: 5000,
      expectedReleaseDate: "2026-09-30",
      paidInAdvance: false,
    },
  ],
});

assert.equal(Buffer.from(pdf.subarray(0, 5)).toString(), "%PDF-");
assert.ok(pdf.byteLength > 500);

console.log("ledger, periods, and pdf checks passed");
