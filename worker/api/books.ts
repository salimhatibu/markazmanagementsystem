import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { bookInventories, bookInventoryItems, expenses } from "../../db/schema";
import { fromCents, toCents } from "../../shared/ledger";
import { requireAdmin } from "../_shared/auth";
import { listBookInventories, toBookInventory } from "../_shared/data";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { bookInventoryFields } from "../_shared/validate";

type Context = { params: Record<string, string> };

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "GET") {
      return json({ inventories: await listBookInventories() });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = bookInventoryFields(body);
      const booksCents = input.items.reduce((sum, item) => sum + toCents(item.price), 0);
      const stationeriesCents = input.stationeriesCost ? toCents(input.stationeriesCost) : 0;
      const total = fromCents(booksCents + stationeriesCents);
      const detailParts = [
        `${input.items.length} ${input.items.length === 1 ? "title" : "titles"}`,
        input.stationeriesNote ? "stationeries" : null,
      ].filter(Boolean);
      // D1 does not support BEGIN/COMMIT — insert in order, then link items.
      const [expense] = await db
        .insert(expenses)
        .values({
          reason: "Books",
          amount: total.toFixed(2),
          details: `${input.title} — ${detailParts.join(" + ")}`,
          spentOn: input.purchasedOn,
        })
        .returning();
      const [inventory] = await db
        .insert(bookInventories)
        .values({
          title: input.title,
          purchasedOn: input.purchasedOn,
          stationeriesNote: input.stationeriesNote,
          stationeriesCost: input.stationeriesCost,
          expenseId: expense.id,
        })
        .returning();
      const items = await db
        .insert(bookInventoryItems)
        .values(
          input.items.map((item) => ({
            inventoryId: inventory.id,
            name: item.name,
            price: item.price,
            sortOrder: item.sortOrder,
          })),
        )
        .returning();
      return json({ inventory: toBookInventory(inventory, items) }, 201);
    }

    if (req.method === "DELETE") {
      const id = parseId(context.params.id);
      if (id == null) return fail("Book list not found.", 404);
      const [existing] = await db
        .select()
        .from(bookInventories)
        .where(eq(bookInventories.id, id))
        .limit(1);
      if (!existing) return fail("Book list not found.", 404);
      if (existing.expenseId != null) {
        await db.batch([
          db.delete(bookInventories).where(eq(bookInventories.id, id)),
          db.delete(expenses).where(eq(expenses.id, existing.expenseId)),
        ]);
      } else {
        await db.delete(bookInventories).where(eq(bookInventories.id, id));
      }
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
