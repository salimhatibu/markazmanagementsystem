import type { Config } from "@netlify/functions";
import { generateOperationsReport } from "./_shared/generate-report";
import { fail, json } from "./_shared/http";
import { isScheduledNextRun } from "./_shared/schedule";

export default async (req: Request) => {
  let body: { next_run?: unknown } = {};
  try {
    body = (await req.json()) as { next_run?: unknown };
  } catch {
    body = {};
  }
  if (!isScheduledNextRun(body.next_run)) {
    return fail("This function runs on its schedule.", 403);
  }
  const report = await generateOperationsReport("biweekly", new Date());
  return json({ ok: true, id: report.id, created: report.created });
};

export const config: Config = {
  schedule: "0 6 1,15 * *",
};
