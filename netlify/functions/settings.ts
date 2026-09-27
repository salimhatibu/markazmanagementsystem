import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { settings } from "../../db/schema";
import { loadSettings } from "./_shared/data";
import { fail, handleError, json, readBody } from "./_shared/http";
import { CURRENCY, MARKAZ_NAME } from "../../shared/format";
import { presentLetterhead } from "../../shared/letterhead";
import { optionalCurrency, optionalText } from "./_shared/validate";

function present(row: Awaited<ReturnType<typeof loadSettings>>) {
  const letterhead = presentLetterhead(row);
  return {
    markazName: row?.markazName?.trim() || MARKAZ_NAME,
    currencySymbol: row?.currencySymbol?.trim() || CURRENCY,
    address: letterhead.address,
    accountName: letterhead.accountName,
    bankName: letterhead.bankName,
    paybill: letterhead.paybill,
    accountNumber: letterhead.accountNumber,
  };
}

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      return json({ settings: present(await loadSettings()) });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const values = {
        markazName: optionalText(body.markazName, "Markaz name", 255),
        currencySymbol: optionalCurrency(body.currencySymbol, "Currency symbol"),
        address: optionalText(body.address, "Address", 255),
        accountName: optionalText(body.accountName, "Account name", 255),
        bankName: optionalText(body.bankName, "Bank name", 255),
        paybill: optionalText(body.paybill, "Paybill", 32),
        accountNumber: optionalText(body.accountNumber, "Account number", 64),
      };
      const current = await loadSettings();
      if (!current) {
        const [created] = await db.insert(settings).values(values).returning();
        return json({ settings: present(created) });
      }
      const [updated] = await db.update(settings).set(values).where(eq(settings.id, current.id)).returning();
      return json({ settings: present(updated) });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/settings",
  method: ["GET", "PUT"],
};
