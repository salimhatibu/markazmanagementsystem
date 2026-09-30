/** Money is handled in integer cents so balances do not drift. */

export function toCents(value: string | number): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error("Amount is not a number.");
  }
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function studentFigures(expectedCents: number, paidCents: number) {
  const balanceCents = expectedCents - paidCents;
  const outstandingCents = Math.max(0, balanceCents);
  const percentPaid = expectedCents === 0 ? 0 : roundPercent((paidCents / expectedCents) * 100);
  return { balanceCents, outstandingCents, percentPaid };
}

export function teacherFigures(expectedCents: number, paidCents: number) {
  const balanceCents = expectedCents - paidCents;
  return { balanceCents };
}

export type PersonMoney = {
  expectedCents: number;
  paidCents: number;
};

/** Cash that moved in one set of books: fees in, salaries and expenses out. */
export function cashBooks(feesCents: number, salariesCents: number, expensesCents: number) {
  return {
    feesCollectedCents: feesCents,
    salariesPaidCents: salariesCents,
    expensesCents,
    inHandCents: feesCents - salariesCents - expensesCents,
    spentCents: salariesCents + expensesCents,
  };
}

export function operationsTotals(
  students: PersonMoney[],
  teachers: PersonMoney[],
  expensesCents = 0,
) {
  const feesCollectedCents = students.reduce((sum, student) => sum + student.paidCents, 0);
  const salariesPaidCents = teachers.reduce((sum, teacher) => sum + teacher.paidCents, 0);
  const outstandingCents = students.reduce((sum, student) => {
    return sum + studentFigures(student.expectedCents, student.paidCents).outstandingCents;
  }, 0);
  return {
    feesCollectedCents,
    salariesPaidCents,
    expensesCents,
    inHandCents: feesCollectedCents - salariesPaidCents - expensesCents,
    spentCents: salariesPaidCents + expensesCents,
    outstandingCents,
  };
}
