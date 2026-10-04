import { generateOperationsReport } from "../_shared/generate-report";
import { fail, json } from "../_shared/http";
import { requireAdmin } from "../_shared/auth";

/** Manual trigger from the desk; cron uses the Worker scheduled handler. */
export default async (req: Request) => {
  if (req.method !== "POST") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  const report = await generateOperationsReport("biweekly", new Date());
  return json({ ok: true, id: report.id, created: report.created });
};
