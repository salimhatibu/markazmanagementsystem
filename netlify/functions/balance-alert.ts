import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "../../db/index";
import { students } from "../../db/schema";
import { displayName, formatMoney, formatPercent } from "../../shared/format";
import { loadSettings, paymentsForStudent, studentOrNull, toStudent } from "./_shared/data";
import { fail, handleError, json, parseId } from "./_shared/http";
import { MAIL_NOT_CONFIGURED, readMailConfig } from "./_shared/mail";
import { headerSafe } from "./_shared/validate";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function stamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return fail("Method not allowed.", 405);
  const mail = readMailConfig();
  if (!mail) return fail("Balance emails are not set up yet.", 503);

  const id = parseId(context.params.id);
  if (id == null) return fail("Student not found.", 404);

  try {
    const student = await studentOrNull(id);
    if (!student) return fail("Student not found.", 404);
    if (!student.guardianEmail) {
      return fail("This student has no guardian email.", 400);
    }

    const previous = stamp(student.lastBalanceAlertAt);
    if (previous && Date.now() - previous < COOLDOWN_MS) {
      return fail("A reminder for this student was already sent today.", 429);
    }

    const dto = toStudent(student, await paymentsForStudent(id));
    const settings = await loadSettings();
    const name = headerSafe(displayName(settings?.markazName), "markaz");
    const studentName = headerSafe(dto.name, "student");
    const admission = headerSafe(dto.admissionNumber, "");
    const to = headerSafe(dto.guardianEmail);
    if (!to) return fail("This student has no guardian email.", 400);
    const symbol = settings?.currencySymbol?.trim() || null;
    const text = [
      `${name} fee balance for ${studentName}${admission ? ` (${admission})` : ""}.`,
      "",
      `Expected fees: ${formatMoney(dto.expectedFees, symbol)}`,
      `Paid: ${formatMoney(dto.paid, symbol)}`,
      `Balance: ${formatMoney(dto.balance, symbol)}`,
      `Percent paid: ${formatPercent(dto.percentPaid)}`,
      "",
      "This is a balance reminder from the markaz office.",
    ].join("\n");

    const transport = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.port === 465,
      auth: { user: mail.user, pass: mail.pass },
    });

    await transport.sendMail({
      from: mail.from,
      to,
      subject: headerSafe(`${name}: fee balance for ${studentName}`, "Fee balance"),
      text,
    });
    await db.update(students).set({ lastBalanceAlertAt: new Date() }).where(eq(students.id, id));

    return json({ sent: true });
  } catch (error) {
    if (error instanceof Error && error.message === MAIL_NOT_CONFIGURED) {
      return fail("Balance emails are not set up yet.", 503);
    }
    console.error("Mail send failed.");
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/students/:id/balance-alert",
  method: "POST",
};
