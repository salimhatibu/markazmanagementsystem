import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index";
import { notifications, posts } from "../../db/schema";
import { asIso } from "../../shared/format";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { oneOf } from "../_shared/validate";

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);

  try {
    if (url.pathname === "/api/notifications/read") {
      if (req.method !== "POST") return fail("Method not allowed.", 405);
      // Reading the reports page must not silently clear unseen reader notes,
      // so a caller may mark just its own kind as read.
      const body = (await readBody(req)) ?? {};
      const kind = body.kind == null ? null : oneOf(body.kind, ["report", "comment"] as const, "Kind");
      await db
        .update(notifications)
        .set({ readAt: new Date().toISOString() })
        .where(
          kind
            ? and(isNull(notifications.readAt), eq(notifications.kind, kind))
            : isNull(notifications.readAt),
        );
      return json({ ok: true });
    }

    if (req.method !== "GET") return fail("Method not allowed.", 405);
    const rows = await db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        title: notifications.title,
        body: notifications.body,
        reportId: notifications.reportId,
        postId: notifications.postId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        postSlug: posts.slug,
      })
      .from(notifications)
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .orderBy(desc(notifications.createdAt));

    const items = rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      reportId: row.reportId,
      postId: row.postId,
      postSlug: row.postSlug,
      readAt: row.readAt ? asIso(row.readAt) : null,
      createdAt: asIso(row.createdAt),
    }));
    const unreadOf = (kind: "report" | "comment") =>
      items.filter((item) => item.readAt == null && item.kind === kind).length;

    return json({
      notifications: items,
      unread: items.filter((item) => item.readAt == null).length,
      unreadReports: unreadOf("report"),
      unreadComments: unreadOf("comment"),
    });
  } catch (error) {
    return handleError(error);
  }
};
