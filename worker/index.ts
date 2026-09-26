import { handleApi, type Env } from "./api";

type WorkerEnv = Env & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
