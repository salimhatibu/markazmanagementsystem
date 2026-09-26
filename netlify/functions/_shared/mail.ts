export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function readMailConfig(): MailConfig | null {
  const host = Netlify.env.get("SMTP_HOST")?.trim();
  const portText = Netlify.env.get("SMTP_PORT")?.trim();
  const user = Netlify.env.get("SMTP_USER")?.trim();
  const pass = Netlify.env.get("SMTP_PASS");
  const from = Netlify.env.get("MARKAZ_FROM")?.trim();
  const port = Number(portText);
  if (!host || !portText || !user || !pass || !from) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port, user, pass, from };
}

export const MAIL_NOT_CONFIGURED = "Mail is not configured.";
