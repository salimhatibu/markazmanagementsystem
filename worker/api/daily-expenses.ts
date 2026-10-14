import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index";
import { dailyExpenseItems, dailyExpenses, expenses } from "../../db/schema";
import { asIso, formatShortDate } from "../../shared/format";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { dailyExpenseFields } from "../_shared/validate";

const LIST_MAX = 120;

type DayRow = typeof dailyExpenses.$inferSelect;
type ItemRow = typeof dailyExpenseItems.$inferSelect;

function present(day: DayRow, items: ItemRow[]) {
  const rows = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const total = rows.reduce((sum, row) => sum + Number(row.cost), 0);
  return {
    id: day.id,
    spentOn: day.spentOn,
    note: day.note,
    expenseId: day.expenseId,
    items: rows.map((row) => ({
      id: row.id,
      item: row.item,
      cost: Number(row.cost),
      details: row.details,
      sortOrder: row.sortOrder,
    })),
    total: Math.round(total * 100) / 100,
    createdAt: asIso(day.createdAt),
  };
}

async function itemsFor(ids: number[]): Promise<Map<number, ItemRow[]>> {
  const map = new Map<number, ItemRow[]>();
  if (ids.length === 0) return map;
  const rows = await db.select().from(dailyExpenseItems).where(inArray(dailyExpenseItems.dailyId, ids));
  for (const row of rows) {
    const list = map.get(row.dailyId) ?? [];
    list.push(row);
    map.set(row.dailyId, list);
  }
  return map;
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const id = parseId(context.params.id);

    if (req.method === "GET") {
      const days = await db
        .select()
        .from(dailyExpenses)
        .orderBy(desc(dailyExpenses.spentOn), desc(dailyExpenses.id))
        .limit(LIST_MAX);
      const map = await itemsFor(days.map((day) => day.id));
      return json({ days: days.map((day) => present(day, map.get(day.id) ?? [])) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = dailyExpenseFields(body);
      const total = input.items.reduce((sum, item) => sum + Number(item.cost), 0);
      const summary = input.items
        .slice(0, 4)
        .map((item) => item.item)
        .join(", ");
      const trailing = input.items.length > 4 ? ` and ${input.items.length - 4} more` : "";

      // D1 has no transactions, so the expense lands first and the day links to it.
      const [expense] = await db
        .insert(expenses)
        .values({
          reason: `Daily expenses — ${formatShortDate(input.spentOn)}`,
          amount: total.toFixed(2),
          details: input.note ?? `${summary}${trailing}`,
          spentOn: input.spentOn,
        })
        .returning();
      const [day] = await db
        .insert(dailyExpenses)
        .values({ spentOn: input.spentOn, note: input.note, expenseId: expense.id })
        .returning();
      const items = await db
        .insert(dailyExpenseItems)
        .values(input.items.map((item) => ({ ...item, dailyId: day.id })))
        .returning();
      return json({ day: present(day, items) }, 201);
    }

    if (req.method === "DELETE") {
      if (id == null) return fail("That day was not found.", 404);
      const [existing] = await db.select().from(dailyExpenses).where(eq(dailyExpenses.id, id)).limit(1);
      if (!existing) return fail("That day was not found.", 404);
      // Items go with the day by cascade; the rolled-up expense goes too.
      await db.delete(dailyExpenses).where(eq(dailyExpenses.id, id));
      if (existing.expenseId != null) {
        await db.delete(expenses).where(eq(expenses.id, existing.expenseId));
      }
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
