import type { Config } from "@netlify/functions";
import { json, requireAdmin } from "./_shared/http";
import { readMailConfig } from "./_shared/mail";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }
  const denied = await requireAdmin();
  if (denied) return denied;
  return json({ configured: readMailConfig() !== null });
};

export const config: Config = {
  path: "/api/mail",
  method: "GET",
};
