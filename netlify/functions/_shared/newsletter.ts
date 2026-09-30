import nodemailer from "nodemailer";
import { db } from "../../../db/index";
import { newsletterSubscribers } from "../../../db/schema";
import { readMailConfig } from "./mail";
import { headerSafe } from "./validate";

const SEND_CAP = 80;

export function siteOrigin(req: Request): string {
  const fromEnv =
    (typeof Netlify !== "undefined" ? Netlify.env.get("URL") : undefined) ?? process.env.URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
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
  const link = `${input.origin}/read/${input.slug}`;
  const subject = headerSafe(`A new paper: ${input.title}`, "A new paper");
  await Promise.allSettled(
    people.map((person) =>
      transport.sendMail({
        from: mail.from,
        to: person.email,
        subject,
        text: [
          input.title,
          "",
          input.excerpt,
          "",
          link,
          "",
          `Stop these letters: ${input.origin}/api/newsletter/leave?token=${encodeURIComponent(person.token)}`,
        ]
          .filter((line) => line !== undefined)
          .join("\n"),
      }),
    ),
  );
}
