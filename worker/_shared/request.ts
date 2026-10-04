import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<Request>();

export function runWithRequest<T>(req: Request, fn: () => T): T {
  return store.run(req, fn);
}

export function currentRequest(): Request {
  const req = store.getStore();
  if (!req) throw new Error("No request is bound.");
  return req;
}
