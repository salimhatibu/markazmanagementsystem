import { requireAdmin } from "../_shared/auth";
import { fail, json } from "../_shared/http";
import { readMailConfig } from "../_shared/mail";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  return json({ configured: readMailConfig() !== null });
};

