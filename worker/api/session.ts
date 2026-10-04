import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, json } from "../_shared/http";
import { getEnv } from "../env";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const identity = await readAccessIdentity(req);
  const env = getEnv();
  return json({
    ok: true,
    openDesk: env.DEV_OPEN_DESK === "1",
    email: identity?.email ?? null,
    name: identity?.name ?? null,
  });
};
