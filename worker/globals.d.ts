import type { Context as RouteContext } from "./_shared/context-types";

declare global {
  type Context = RouteContext;
}

export {};
