import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index";
import { notificationReads, notifications, posts } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { oneOf } from "../_shared/validate";

const KINDS = ["report", "comment", "notice", "like", "panic"] as const;

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);

  try {
    const identity = await readAccessIdentity(req);
    const email = identity?.email?.toLowerCase() ?? "";
    if (!email) return fail("Sign in to continue.", 401);

    if (url.pathname === "/api/notifications/read") {
      if (req.method !== "POST") return fail("Method not allowed.", 405);
      // Reading is personal, so this records a row for this keeper rather than
      // clearing the notification for everyone.
      const body = (await readBody(req)) ?? {};
      const kind = body.kind == null ? null : oneOf(body.kind, KINDS, "Kind");

      const pending = await db
        .select({ id: notifications.id })
        .from(notifications)
        .leftJoin(
          notificationReads,
          and(
            eq(notificationReads.notificationId, notifications.id),
            eq(notificationReads.email, email),
          ),
        )
        .where(
          and(
            isNull(notifications.readAt),
            kind ? eq(notifications.kind, kind) : undefined,
            isNull(notificationReads.notificationId),
          ),
        );
      if (pending.length > 0) {
        await db
          .insert(notificationReads)
          .values(pending.map((row) => ({ notificationId: row.id, email })))
          .onConflictDoNothing();
      }
      return json({ ok: true, marked: pending.length });
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
        author: notifications.author,
        legacyReadAt: notifications.readAt,
        createdAt: notifications.createdAt,
        postSlug: posts.slug,
        personalReadAt: notificationReads.readAt,
      })
      .from(notifications)
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.email, email),
        ),
      )
      .orderBy(desc(notifications.createdAt));

    const items = rows.map((row) => {
      // Anything marked read before per-keeper tracking stays read for everyone.
      const readAt = row.personalReadAt ?? row.legacyReadAt;
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        reportId: row.reportId,
        postId: row.postId,
        postSlug: row.postSlug,
        author: row.author,
        readAt: readAt ? asIso(readAt) : null,
        createdAt: asIso(row.createdAt),
      };
    });

    const unreadOf = (kind: (typeof KINDS)[number]) =>
      items.filter((item) => item.readAt == null && item.kind === kind).length;

    return json({
      notifications: items,
      unread: items.filter((item) => item.readAt == null).length,
      unreadReports: unreadOf("report"),
      unreadComments: unreadOf("comment"),
      unreadNotices: unreadOf("notice"),
    });
  } catch (error) {
    return handleError(error);
  }
};
