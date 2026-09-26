import type { Config } from "@netlify/functions";
import { desc, isNull } from "drizzle-orm";
import { db } from "../../db/index";
import { notifications } from "../../db/schema";
import { asIso } from "../../shared/format";
import { fail, handleError, json } from "./_shared/http";

export default async (req: Request) => {
  const url = new URL(req.url);

  try {
    if (url.pathname === "/api/notifications/read") {
      if (req.method !== "POST") return fail("Method not allowed.", 405);
      await db.update(notifications).set({ readAt: new Date().toISOString() }).where(isNull(notifications.readAt));
      return json({ ok: true });
    }

    if (req.method !== "GET") return fail("Method not allowed.", 405);
    const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      reportId: row.reportId,
      readAt: row.readAt ? asIso(row.readAt) : null,
      createdAt: asIso(row.createdAt),
    }));
    return json({
      notifications: items,
      unread: items.filter((item) => item.readAt == null).length,
    });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/notifications", "/api/notifications/read"],
  method: ["GET", "POST"],
};
