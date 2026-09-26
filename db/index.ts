import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

const databases = new AsyncLocalStorage<Database>();
const requests = new AsyncLocalStorage<Request>();
const bindings = new AsyncLocalStorage<Record<string, string | undefined>>();

export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}

export function bindRequest<T>(
  database: Database,
  request: Request,
  env: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  return databases.run(database, () => bindings.run(env, () => requests.run(request, fn)));
}

function currentDatabase(): Database {
  const database = databases.getStore();
  if (!database) throw new Error("Database is not available for this request.");
  return database;
}

export function currentRequest(): Request {
  const request = requests.getStore();
  if (!request) throw new Error("Request is not available.");
  return request;
}

export function envValue(name: string): string | undefined {
  return bindings.getStore()?.[name];
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const database = currentDatabase();
    const value = database[prop as keyof Database];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(database) : value;
  },
});
