import type { Config, Context } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { expenses } from "../../db/schema";
import { toExpense } from "./_shared/data";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, json, parseId, readBody } from "./_shared/http";
import { expenseFields } from "./_shared/validate";

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "GET") {
      const rows = await db.select().from(expenses).orderBy(desc(expenses.spentOn), desc(expenses.id));
      return json({ expenses: rows.map(toExpense) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = expenseFields(body);
      const [created] = await db.insert(expenses).values(input).returning();
      return json({ expense: toExpense(created) }, 201);
    }

    if (req.method === "DELETE") {
      const id = parseId(context.params.id);
      if (id == null) return fail("Expense not found.", 404);
      const [removed] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
      if (!removed) return fail("Expense not found.", 404);
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/expenses", "/api/expenses/:id"],
  method: ["GET", "POST", "DELETE"],
};
