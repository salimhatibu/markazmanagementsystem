import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json } from "../_shared/http";
import { loadDashboardTotals } from "../_shared/data";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return json(await loadDashboardTotals());
  } catch (error) {
    return handleError(error);
  }
};

