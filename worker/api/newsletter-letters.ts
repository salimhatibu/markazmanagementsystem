import nodemailer from "nodemailer";
import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { newsletterLetters, newsletterSubscribers } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { publicOriginFromEnv } from "../_shared/hosts";
import { fail, handleError, json, readBody } from "../_shared/http";
import { MAIL_NOT_CONFIGURED, readMailConfig } from "../_shared/mail";
import { headerSafe, requiredMessage, requiredText } from "../_shared/validate";

const LIST_MAX = 50;
const SEND_CAP = 500;

function present(row: typeof newsletterLetters.$inferSelect) {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    author: row.author,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    sentAt: row.sentAt ? asIso(row.sentAt) : null,
    createdAt: asIso(row.createdAt),
  };
}

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(newsletterLetters)
        .orderBy(desc(newsletterLetters.createdAt))
        .limit(LIST_MAX);
      return json({ letters: rows.map(present), mailReady: readMailConfig() != null });
    }

    if (req.method !== "POST") return fail("Method not allowed.", 405);

    const body = await readBody(req);
    if (!body) return fail("Request body must be an object.", 400);
    const subject = requiredText(body.subject, "Subject", 200);
    const text = requiredMessage(body.body, "Letter", 8000);
    const identity = await readAccessIdentity(req);
    const author = identity?.email?.toLowerCase() ?? null;

    const people = await db
      .select({ email: newsletterSubscribers.email, token: newsletterSubscribers.token })
      .from(newsletterSubscribers)
      .limit(SEND_CAP);
    if (people.length === 0) return fail("No one has left an email address yet.", 400);

    const mail = readMailConfig();
    if (!mail) {
      // The letter is kept either way, so nothing a keeper wrote is lost while
      // the mailbox is still to be set up.
      const [saved] = await db
        .insert(newsletterLetters)
        .values({ subject, body: text, author, sentCount: 0, failedCount: 0, sentAt: null })
        .returning();
      return json({ letter: present(saved), sent: false, reason: MAIL_NOT_CONFIGURED, waiting: people.length }, 202);
    }

    const origin = publicOriginFromEnv(req).replace(/\/$/, "");
    const transport = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.port === 465,
      auth: { user: mail.user, pass: mail.pass },
    });
    const results = await Promise.allSettled(
      people.map((person) =>
        transport.sendMail({
          from: mail.from,
          to: person.email,
          subject: headerSafe(subject) || "A letter",
          text: [
            text,
            "",
            `Stop these letters: ${origin}/api/newsletter/leave?token=${encodeURIComponent(person.token)}`,
          ].join("\n"),
        }),
      ),
    );
    const sentCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - sentCount;

    const [saved] = await db
      .insert(newsletterLetters)
      .values({
        subject,
        body: text,
        author,
        sentCount,
        failedCount,
        sentAt: sentCount > 0 ? new Date().toISOString() : null,
      })
      .returning();
    return json({ letter: present(saved), sent: sentCount > 0, sentCount, failedCount }, 201);
  } catch (error) {
    return handleError(error);
  }
};
