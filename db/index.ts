import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type AppDb = DrizzleD1Database<typeof schema>;

let active: AppDb | null = null;

export function bindDb(d1: D1Database): AppDb {
  active = drizzle(d1, { schema });
  return active;
}

export function getDb(): AppDb {
  if (!active) throw new Error("Database is not bound for this request.");
  return active;
}

/** Request-scoped alias used by API modules. */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const current = getDb();
    const value = Reflect.get(current, prop, receiver);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
