import type { Config, Context } from "@netlify/functions";
import nodemailer from "nodemailer";
import { displayName, formatMoney, formatPercent } from "../../shared/format";
import { loadSettings, paymentsForStudent, studentOrNull, toStudent } from "./_shared/data";
import { fail, handleError, json, parseId } from "./_shared/http";
import { MAIL_NOT_CONFIGURED, readMailConfig } from "./_shared/mail";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return fail("Method not allowed.", 405);
  const mail = readMailConfig();
  if (!mail) return fail(MAIL_NOT_CONFIGURED, 503);

  const id = parseId(context.params.id);
  if (id == null) return fail("Student not found.", 404);

  try {
    const student = await studentOrNull(id);
    if (!student) return fail("Student not found.", 404);
    if (!student.guardianEmail) {
      return fail("This student has no guardian email.", 400);
    }

    const dto = toStudent(student, await paymentsForStudent(id));
    const settings = await loadSettings();
    const name = displayName(settings?.markazName);
    const symbol = settings?.currencySymbol?.trim() || null;
    const text = [
      `${name} fee balance for ${dto.name} (${dto.admissionNumber}).`,
      "",
      `Expected fees: ${formatMoney(dto.expectedFees, symbol)}`,
      `Paid: ${formatMoney(dto.paid, symbol)}`,
      `Balance: ${formatMoney(dto.balance, symbol)}`,
      `Percent paid: ${formatPercent(dto.percentPaid)}`,
      "",
      "This is a balance alert from the markaz office.",
    ].join("\n");

    const transport = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.port === 465,
      auth: { user: mail.user, pass: mail.pass },
    });

    await transport.sendMail({
      from: mail.from,
      to: dto.guardianEmail,
      subject: `${name}: fee balance for ${dto.name}`,
      text,
    });

    return json({ sent: true });
  } catch (error) {
    if (error instanceof Error && error.message === MAIL_NOT_CONFIGURED) {
      return fail(MAIL_NOT_CONFIGURED, 503);
    }
    console.error(error instanceof Error ? error.message : "Mail send failed.");
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/students/:id/balance-alert",
  method: "POST",
};
