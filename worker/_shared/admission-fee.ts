import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { feePayments } from "../../db/schema";
import { eatDate } from "../../shared/format";
import { paymentsForStudent } from "./data";

export const ADMISSION_FEE_NOTE = "Admission fee";

function isAdmissionNote(note: string | null): boolean {
  return (note ?? "").trim().toLowerCase() === ADMISSION_FEE_NOTE.toLowerCase();
}

/** Record or refresh the admission fee payment when the desk marks it collected. */
export async function syncAdmissionFeePayment(
  studentId: number,
  collected: boolean,
  amount: string,
): Promise<void> {
  if (!collected || Number(amount) <= 0) return;
  const payments = await paymentsForStudent(studentId);
  const existing = payments.find((payment) => isAdmissionNote(payment.note));
  if (existing) {
    if (existing.amount !== amount) {
      await db.update(feePayments).set({ amount }).where(eq(feePayments.id, existing.id));
    }
    return;
  }
  await db.insert(feePayments).values({
    studentId,
    amount,
    paidOn: eatDate(),
    note: ADMISSION_FEE_NOTE,
  });
}
