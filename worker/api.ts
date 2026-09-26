import type { D1Database } from "@cloudflare/workers-types";
import { bindRequest, createDb } from "../db/index";
import { D1_SCHEMA_SQL } from "../shared/d1-schema";
import { loginAccount, logoutAccount, registerAccount, currentAccount } from "../netlify/functions/_shared/accounts";
import { readBody } from "../netlify/functions/_shared/http";
import balanceAlert from "../netlify/functions/balance-alert";
import dashboard from "../netlify/functions/dashboard";
import feePayments from "../netlify/functions/fee-payments";
import mail from "../netlify/functions/mail";
import notifications from "../netlify/functions/notifications";
import reportFile from "../netlify/functions/report-file";
import reports from "../netlify/functions/reports";
import salaryPayments from "../netlify/functions/salary-payments";
import settings from "../netlify/functions/settings";
import student from "../netlify/functions/student";
import students from "../netlify/functions/students";
import teacher from "../netlify/functions/teacher";
import teachers from "../netlify/functions/teachers";

export type Env = {
  DB?: D1Database;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MARKAZ_FROM?: string;
};

type Handler = (req: Request, context: { params: Record<string, string> }) => Promise<Response>;

const routes: { pattern: RegExp; handler: Handler; keys: string[] }[] = [
  { pattern: /^\/api\/students\/([^/]+)\/balance-alert$/, handler: balanceAlert as Handler, keys: ["id"] },
  { pattern: /^\/api\/students\/([^/]+)\/payments$/, handler: feePayments as Handler, keys: ["id"] },
  { pattern: /^\/api\/fee-payments\/([^/]+)$/, handler: feePayments as Handler, keys: ["id"] },
  { pattern: /^\/api\/students\/([^/]+)$/, handler: student as Handler, keys: ["id"] },
  { pattern: /^\/api\/students$/, handler: students as Handler, keys: [] },
  { pattern: /^\/api\/teachers\/([^/]+)\/payments$/, handler: salaryPayments as Handler, keys: ["id"] },
  { pattern: /^\/api\/salary-payments\/([^/]+)$/, handler: salaryPayments as Handler, keys: ["id"] },
  { pattern: /^\/api\/teachers\/([^/]+)$/, handler: teacher as Handler, keys: ["id"] },
  { pattern: /^\/api\/teachers$/, handler: teachers as Handler, keys: [] },
  { pattern: /^\/api\/reports\/([^/]+)\/file$/, handler: reportFile as Handler, keys: ["id"] },
  { pattern: /^\/api\/reports$/, handler: reports as Handler, keys: [] },
  { pattern: /^\/api\/notifications\/read$/, handler: notifications as Handler, keys: [] },
  { pattern: /^\/api\/notifications$/, handler: notifications as Handler, keys: [] },
  { pattern: /^\/api\/dashboard$/, handler: dashboard as Handler, keys: [] },
  { pattern: /^\/api\/settings$/, handler: settings as Handler, keys: [] },
  { pattern: /^\/api\/mail$/, handler: mail as Handler, keys: [] },
];

function mailEnv(env: Env): Record<string, string | undefined> {
  return {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    MARKAZ_FROM: env.MARKAZ_FROM,
  };
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (pathname === "/api/auth/register" && request.method === "POST") {
    return registerAccount(request, await readBody(request));
  }
  if (pathname === "/api/auth/login" && request.method === "POST") {
    return loginAccount(request, await readBody(request));
  }
  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return logoutAccount(request);
  }
  if (pathname === "/api/auth/me" && request.method === "GET") {
    const user = await currentAccount(request);
    return Response.json({ user });
  }

  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1] ?? "");
    });
    return route.handler(request, { params });
  }

  return Response.json({ error: "Not found." }, { status: 404 });
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const context = { request, env };
  if (!context.env.DB) {
    return Response.json(
      { error: "Database is not connected. In Cloudflare, bind a D1 database to the name DB." },
      { status: 503 },
    );
  }
  const statements = D1_SCHEMA_SQL.split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await context.env.DB.prepare(statement).run();
  }
  const database = createDb(context.env.DB);
  return bindRequest(database, context.request, mailEnv(context.env), () => route(context.request));
}
