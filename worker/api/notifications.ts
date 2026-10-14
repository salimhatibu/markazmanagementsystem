import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { db } from "../../db/index";
import { notificationReads, notifications, posts } from "../../db/schema";
import { asIso } from "../../shared/format";
import { readAccessIdentity, requireAdmin } from "../_shared/auth";
import { fail, handleError, json, readBody } from "../_shared/http";
import { oneOf, optionalMessage, requiredText } from "../_shared/validate";

const KINDS = ["report", "comment", "notice"] as const;

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

      const mine = await db
        .select({ notificationId: notificationReads.notificationId })
        .from(notificationReads)
        .where(eq(notificationReads.email, email));
      const already = mine.map((row) => row.notificationId);

      const pending = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            isNull(notifications.readAt),
            kind ? eq(notifications.kind, kind) : undefined,
            already.length > 0 ? notInArray(notifications.id, already) : undefined,
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

    if (req.method === "POST") {
      // A keeper writing a notice for the other keepers.
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const title = requiredText(body.title, "Title", 200);
      const text = optionalMessage(body.body, "Message", 4000);
      const [created] = await db
        .insert(notifications)
        .values({ kind: "notice", title, body: text, author: email })
        .returning();
      // The writer has plainly read their own notice.
      await db
        .insert(notificationReads)
        .values({ notificationId: created.id, email })
        .onConflictDoNothing();
      return json({ notification: { id: created.id, title: created.title } }, 201);
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
      })
      .from(notifications)
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .orderBy(desc(notifications.createdAt));

    const ids = rows.map((row) => row.id);
    const readRows =
      ids.length > 0
        ? await db
            .select({ notificationId: notificationReads.notificationId, readAt: notificationReads.readAt })
            .from(notificationReads)
            .where(and(eq(notificationReads.email, email), inArray(notificationReads.notificationId, ids)))
        : [];
    const readByMe = new Map(readRows.map((row) => [row.notificationId, row.readAt]));

    const items = rows.map((row) => {
      const mine = readByMe.get(row.id) ?? null;
      // Anything marked read before per-keeper tracking stays read for everyone.
      const readAt = mine ?? row.legacyReadAt;
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
