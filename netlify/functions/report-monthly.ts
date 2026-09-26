import type { Config } from "@netlify/functions";
import { generateOperationsReport } from "./_shared/generate-report";

export default async (req: Request) => {
  let body: { next_run?: string } = {};
  try {
    body = (await req.json()) as { next_run?: string };
  } catch {
    body = {};
  }
  if (!body.next_run) {
    return Response.json({ error: "This function runs on its schedule." }, { status: 403 });
  }
  const report = await generateOperationsReport("monthly", new Date());
  console.log("Monthly report created", report.id, "next", body.next_run);
  return Response.json({ ok: true, id: report.id });
};

export const config: Config = {
  schedule: "30 6 1 * *",
};
