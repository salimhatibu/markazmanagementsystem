import type { Config } from "@netlify/functions";
import { fail, json } from "./_shared/http";
import { readMailConfig } from "./_shared/mail";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  return json({ configured: readMailConfig() !== null });
};

export const config: Config = {
  path: "/api/mail",
  method: "GET",
};
