import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { trips } from "../../db/schema";
import { requireAdmin } from "../_shared/auth";
import { entriesForTrip, listTrips, toTripDetail, tripOrNull } from "../_shared/data";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { tripFields } from "../_shared/validate";

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (req.method === "GET" && !context.params.id) {
      return json({ trips: await listTrips() });
    }

    if (req.method === "GET" && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Trip not found.", 404);
      const row = await tripOrNull(id);
      if (!row) return fail("Trip not found.", 404);
      const entries = await entriesForTrip(id);
      return json({ trip: toTripDetail(row, entries) });
    }

    if (req.method === "POST" && !context.params.id) {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = tripFields(body);
      const [created] = await db.insert(trips).values(input).returning();
      return json({ trip: toTripDetail(created, []) }, 201);
    }

    if (req.method === "PUT" && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Trip not found.", 404);
      const existing = await tripOrNull(id);
      if (!existing) return fail("Trip not found.", 404);
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = tripFields(body);
      const [updated] = await db
        .update(trips)
        .set({ ...input, updatedAt: new Date().toISOString() })
        .where(eq(trips.id, id))
        .returning();
      const entries = await entriesForTrip(id);
      return json({ trip: toTripDetail(updated, entries) });
    }

    if (req.method === "DELETE" && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Trip not found.", 404);
      const existing = await tripOrNull(id);
      if (!existing) return fail("Trip not found.", 404);
      await db.delete(trips).where(eq(trips.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
