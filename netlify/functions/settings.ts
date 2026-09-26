import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { settings } from "../../db/schema";
import { loadSettings } from "./_shared/data";
import { fail, handleError, json, readBody, requireAdmin } from "./_shared/http";
import { optionalText } from "./_shared/validate";

function present(row: { markazName: string | null; currencySymbol: string | null } | null) {
  return {
    markazName: row?.markazName?.trim() || null,
    currencySymbol: row?.currencySymbol?.trim() || null,
  };
}

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (req.method === "GET") {
      return json({ settings: present(await loadSettings()) });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const markazName = optionalText(body.markazName, "Markaz name", 255);
      const currencySymbol = optionalText(body.currencySymbol, "Currency symbol", 16);
      const current = await loadSettings();
      if (!current) {
        const [created] = await db
          .insert(settings)
          .values({ markazName, currencySymbol })
          .returning();
        return json({ settings: present(created) });
      }
      const [updated] = await db
        .update(settings)
        .set({ markazName, currencySymbol })
        .where(eq(settings.id, current.id))
        .returning();
      return json({ settings: present(updated) });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/settings",
  method: ["GET", "PUT"],
};
