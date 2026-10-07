import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { tripEntries, trips } from "../../db/schema";
import { requireAdmin } from "../_shared/auth";
import { entriesForTrip, toTripDetail, toTripEntry, tripOrNull } from "../_shared/data";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { tripEntryFields } from "../_shared/validate";

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (req.method === "POST" && context.params.tripId) {
      const tripId = parseId(context.params.tripId);
      if (tripId == null) return fail("Trip not found.", 404);
      const trip = await tripOrNull(tripId);
      if (!trip) return fail("Trip not found.", 404);
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = tripEntryFields(body);
      const [created] = await db
        .insert(tripEntries)
        .values({ ...input, tripId })
        .returning();
      await db.update(trips).set({ updatedAt: new Date().toISOString() }).where(eq(trips.id, tripId));
      const entries = await entriesForTrip(tripId);
      return json({ entry: toTripEntry(created), trip: toTripDetail(trip, entries) }, 201);
    }

    if ((req.method === "PUT" || req.method === "DELETE") && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Entry not found.", 404);
      const [existing] = await db.select().from(tripEntries).where(eq(tripEntries.id, id)).limit(1);
      if (!existing) return fail("Entry not found.", 404);
      const trip = await tripOrNull(existing.tripId);
      if (!trip) return fail("Trip not found.", 404);

      if (req.method === "DELETE") {
        await db.delete(tripEntries).where(eq(tripEntries.id, id));
        await db
          .update(trips)
          .set({ updatedAt: new Date().toISOString() })
          .where(eq(trips.id, existing.tripId));
        const entries = await entriesForTrip(existing.tripId);
        return json({ ok: true, trip: toTripDetail(trip, entries) });
      }

      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = tripEntryFields(body);
      const [updated] = await db
        .update(tripEntries)
        .set(input)
        .where(eq(tripEntries.id, id))
        .returning();
      await db
        .update(trips)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(trips.id, existing.tripId));
      const entries = await entriesForTrip(existing.tripId);
      return json({ entry: toTripEntry(updated), trip: toTripDetail(trip, entries) });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
