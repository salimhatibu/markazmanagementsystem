import type { Config } from "@netlify/functions";
import { desc, isNull } from "drizzle-orm";
import { db } from "../../db/index";
import { notifications } from "../../db/schema";
import { fail, handleError, json, requireUser } from "./_shared/http";

export default async (req: Request) => {
  const denied = await requireUser();
  if (denied) return denied;

  const url = new URL(req.url);

  try {
    if (url.pathname === "/api/notifications/read") {
      if (req.method !== "POST") return fail("Method not allowed.", 405);
      await db.update(notifications).set({ readAt: new Date() }).where(isNull(notifications.readAt));
      return json({ ok: true });
    }

    if (req.method !== "GET") return fail("Method not allowed.", 405);
    const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      reportId: row.reportId,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
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
