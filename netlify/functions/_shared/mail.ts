export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function setting(name: string): string | undefined {
  const fromNetlify = typeof Netlify !== "undefined" ? Netlify.env.get(name) : undefined;
  return fromNetlify ?? process.env[name];
}

const FROM = /^(?:[\w .,'-]{1,80} <[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export function readMailConfig(): MailConfig | null {
  const host = setting("SMTP_HOST")?.trim();
  const portText = setting("SMTP_PORT")?.trim();
  const user = setting("SMTP_USER")?.trim();
  const pass = setting("SMTP_PASS");
  const from = setting("MARKAZ_FROM")?.trim();
  const port = Number(portText);
  if (!host || !portText || !user || !pass || !from) return null;
  if (host.includes("\n") || host.includes("\r") || host.length > 255) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (!FROM.test(from) || /[\r\n]/.test(from)) return null;
  return { host, port, user, pass, from };
}

export const MAIL_NOT_CONFIGURED = "Mail is not configured.";
