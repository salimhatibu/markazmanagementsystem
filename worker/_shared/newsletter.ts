import nodemailer from "nodemailer";
import { db } from "../../db/index";
import { newsletterSubscribers } from "../../db/schema";
import { getEnv } from "../env";
import { readMailConfig } from "./mail";
import { headerSafe } from "./validate";

const SEND_CAP = 80;

export function siteOrigin(req: Request): string {
  try {
    const fromEnv = getEnv().SITE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
  } catch {
    /* unbound outside a request */
  }
  return new URL(req.url).origin;
}

/** Best-effort note when a draft first becomes public. A missing mailbox must not block the post. */
export async function notifyNewPaper(input: {
  title: string;
  excerpt: string;
  slug: string;
  origin: string;
}) {
  const mail = readMailConfig();
  if (!mail) return;
  const people = await db
    .select({
      email: newsletterSubscribers.email,
      token: newsletterSubscribers.token,
    })
    .from(newsletterSubscribers)
    .limit(SEND_CAP);
  if (!people.length) return;

  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: { user: mail.user, pass: mail.pass },
  });
  const origin = input.origin.replace(/\/$/, "");
  const link = `${origin}/${input.slug}`;
  const subject = headerSafe(input.title) || "New paper";
  await Promise.allSettled(
    people.map((person) =>
      transport.sendMail({
        from: mail.from,
        to: person.email,
        subject,
        text: [
          input.excerpt.trim() || input.title,
          "",
          `Read: ${link}`,
          "",
          `Stop these letters: ${origin}/api/newsletter/leave?token=${encodeURIComponent(person.token)}`,
        ].join("\n"),
      }),
    ),
  );
}
