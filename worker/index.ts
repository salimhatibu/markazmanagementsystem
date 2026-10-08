import type { WorkerEnv } from "./env";
import { bindRequest } from "./_shared/context";
import { runWithRequest } from "./_shared/request";
import { fail } from "./_shared/http";
import { generateOperationsReport } from "./_shared/generate-report";
import {
  hostSurface,
  isPublicApiAllowed,
  publicOriginFromEnv,
  stripReadPrefix,
} from "./_shared/hosts";

import dashboard from "./api/dashboard";
import students from "./api/students";
import classes from "./api/classes";
import student from "./api/student";
import feePayments from "./api/fee-payments";
import balanceAlert from "./api/balance-alert";
import teachers from "./api/teachers";
import teacher from "./api/teacher";
import salaryPayments from "./api/salary-payments";
import expenses from "./api/expenses";
import books from "./api/books";
import kharajah from "./api/kharajah";
import trips from "./api/trips";
import tripEntries from "./api/trip-entries";
import feedback from "./api/feedback";
import reports from "./api/reports";
import reportFile from "./api/report-file";
import reportBiweekly from "./api/report-biweekly";
import reportMonthly from "./api/report-monthly";
import notifications from "./api/notifications";
import settings from "./api/settings";
import mail from "./api/mail";
import session from "./api/session";
import presence from "./api/presence";
import ocr from "./api/ocr";
import posts from "./api/posts";
import series from "./api/series";
import blogMedia from "./api/blog-media";
import blogEvents from "./api/blog-events";
import blogAnalytics from "./api/blog-analytics";
import blogComments from "./api/blog-comments";
import blogLikes from "./api/blog-likes";
import blogSaves from "./api/blog-saves";
import readerSaves from "./api/reader-saves";
import newsletter from "./api/newsletter";
import feeds from "./api/feeds";
import studentFile from "./api/student-file";
import studentsListFile from "./api/students-list-file";
import teacherFile from "./api/teacher-file";
import teachersListFile from "./api/teachers-list-file";

type Handler = (req: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;

type Route = {
  methods?: string[];
  pattern: RegExp;
  handler: Handler;
  params?: string[];
};

const routes: Route[] = [
  { pattern: /^\/api\/dashboard\/?$/, handler: dashboard },
  { pattern: /^\/api\/classes\/?$/, handler: classes },
  { pattern: /^\/api\/classes\/(\d+)\/students\/(\d+)\/?$/, handler: classes, params: ["id", "studentId"] },
  { pattern: /^\/api\/classes\/(\d+)\/students\/?$/, handler: classes, params: ["id"] },
  { pattern: /^\/api\/classes\/(\d+)\/?$/, handler: classes, params: ["id"] },
  { pattern: /^\/api\/students\/?$/, handler: students },
  { pattern: /^\/api\/students\/file\/?$/, handler: studentsListFile },
  { pattern: /^\/api\/students\/(\d+)\/payments\/?$/, handler: feePayments, params: ["id"] },
  { pattern: /^\/api\/students\/(\d+)\/balance-alert\/?$/, handler: balanceAlert, params: ["id"] },
  { pattern: /^\/api\/students\/(\d+)\/file\/?$/, handler: studentFile, params: ["id"] },
  { pattern: /^\/api\/students\/(\d+)\/?$/, handler: student, params: ["id"] },
  { pattern: /^\/api\/kharajah(?:\/(\d+))?\/?$/, handler: kharajah, params: ["id"] },
  { pattern: /^\/api\/fee-payments\/(\d+)\/?$/, handler: feePayments, params: ["id"] },
  { pattern: /^\/api\/teachers\/?$/, handler: teachers },
  { pattern: /^\/api\/teachers\/file\/?$/, handler: teachersListFile },
  { pattern: /^\/api\/teachers\/(\d+)\/payments\/?$/, handler: salaryPayments, params: ["id"] },
  { pattern: /^\/api\/teachers\/(\d+)\/file\/?$/, handler: teacherFile, params: ["id"] },
  { pattern: /^\/api\/teachers\/(\d+)\/?$/, handler: teacher, params: ["id"] },
  { pattern: /^\/api\/salary-payments\/(\d+)\/?$/, handler: salaryPayments, params: ["id"] },
  { pattern: /^\/api\/expenses(?:\/(\d+))?\/?$/, handler: expenses, params: ["id"] },
  { pattern: /^\/api\/books(?:\/(\d+))?\/?$/, handler: books, params: ["id"] },
  { pattern: /^\/api\/trips\/(\d+)\/entries\/?$/, handler: tripEntries, params: ["tripId"] },
  { pattern: /^\/api\/trip-entries\/(\d+)\/?$/, handler: tripEntries, params: ["id"] },
  { pattern: /^\/api\/trips(?:\/(\d+))?\/?$/, handler: trips, params: ["id"] },
  { pattern: /^\/api\/feedback(?:\/(\d+))?\/?$/, handler: feedback, params: ["id"] },
  { pattern: /^\/api\/reports\/(\d+)\/file\/?$/, handler: reportFile, params: ["id"] },
  { pattern: /^\/api\/reports(?:\/(\d+))?\/?$/, handler: reports, params: ["id"] },
  { pattern: /^\/api\/report-biweekly\/?$/, handler: reportBiweekly },
  { pattern: /^\/api\/report-monthly\/?$/, handler: reportMonthly },
  { pattern: /^\/api\/notifications(?:\/read)?\/?$/, handler: notifications },
  { pattern: /^\/api\/settings\/?$/, handler: settings },
  { pattern: /^\/api\/mail\/?$/, handler: mail },
  { pattern: /^\/api\/session\/?$/, handler: session },
  { pattern: /^\/api\/presence\/?$/, handler: presence },
  { pattern: /^\/api\/ocr\/?$/, handler: ocr },
  { pattern: /^\/api\/posts(?:\/(\d+))?\/?$/, handler: posts, params: ["id"] },
  { pattern: /^\/api\/series(?:\/([^/]+))?\/?$/, handler: series, params: ["key"] },
  { pattern: /^\/api\/blog-media\/blog\/([^/]+)\/?$/, handler: blogMedia, params: ["key"] },
  { pattern: /^\/api\/blog-media\/?$/, handler: blogMedia },
  { pattern: /^\/api\/blog-events\/?$/, handler: blogEvents },
  { pattern: /^\/api\/blog-analytics\/?$/, handler: blogAnalytics },
  { pattern: /^\/api\/blog-comments\/(\d+)\/?$/, handler: blogComments, params: ["postId"] },
  { pattern: /^\/api\/blog-likes\/(\d+)\/?$/, handler: blogLikes, params: ["postId"] },
  { pattern: /^\/api\/blog-saves\/(\d+)\/?$/, handler: blogSaves, params: ["postId"] },
  { pattern: /^\/api\/reader-saves\/?$/, handler: readerSaves },
  { pattern: /^\/api\/newsletter(?:\/leave)?\/?$/, handler: newsletter },
  { pattern: /^\/(?:sitemap|rss)\.xml$/, handler: feeds },
];

function matchRoute(pathname: string): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: Record<string, string> = {};
    (route.params ?? []).forEach((name, index) => {
      const value = match[index + 1];
      if (value != null && value !== "") params[name] = value;
    });
    return { handler: route.handler, params };
  }
  return null;
}

function redirect(to: string, status: 301 | 302): Response {
  return new Response(null, { status, headers: { Location: to } });
}

function handleHostRedirects(req: Request, url: URL): Response | null {
  const surface = hostSurface(req);
  const stripped = stripReadPrefix(url.pathname);
  if (stripped == null) return null;

  if (surface === "public") {
    const target = new URL(url);
    target.pathname = stripped;
    return redirect(target.pathname + target.search + target.hash, 301);
  }

  if (surface === "admin" || surface === "legacy") {
    // On admin (and production workers.dev once hosts are set), send readers to the papers host.
    if (surface === "legacy" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      return null;
    }
    const origin = publicOriginFromEnv(req);
    return redirect(`${origin}${stripped === "/" ? "/" : stripped}${url.search}${url.hash}`, 302);
  }

  return null;
}

async function handleRequest(req: Request, env: WorkerEnv): Promise<Response> {
  bindRequest(env);
  const url = new URL(req.url);
  const surface = hostSurface(req);

  const hostRedirect = handleHostRedirects(req, url);
  if (hostRedirect) return hostRedirect;

  const matched = matchRoute(url.pathname);
  if (!matched) {
    if (url.pathname.startsWith("/api/")) return fail("Not found.", 404);
    return env.ASSETS.fetch(req);
  }

  if (surface === "public" && !isPublicApiAllowed(url.pathname, req.method, url.search)) {
    return fail("Not found.", 404);
  }

  return runWithRequest(req, () => matched.handler(req, { params: matched.params }));
}

export default {
  async fetch(req: Request, env: WorkerEnv): Promise<Response> {
    try {
      return await handleRequest(req, env);
    } catch (error) {
      console.error(error);
      return fail("Something went wrong. Please try again.", 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: WorkerEnv): Promise<void> {
    bindRequest(env);
    const now = new Date(event.scheduledTime);
    if (event.cron === "0 6 1,15 * *") {
      await generateOperationsReport("biweekly", now);
      return;
    }
    if (event.cron === "30 6 1 * *") {
      await generateOperationsReport("monthly", now);
    }
  },
};
