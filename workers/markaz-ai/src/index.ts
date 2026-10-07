export type AiEnv = {
  AI: Ai;
  MARKAZ_AI_SECRET?: string;
};

type RunBody = {
  model: string;
  input: Record<string, unknown>;
};

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

function allowed(req: Request, env: AiEnv): boolean {
  const expected = env.MARKAZ_AI_SECRET?.trim();
  if (!expected) return false;
  return req.headers.get("x-markaz-ai-secret")?.trim() === expected;
}

export default {
  async fetch(req: Request, env: AiEnv): Promise<Response> {
    if (!allowed(req, env)) return unauthorized();
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/run") {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    try {
      const body = (await req.json()) as RunBody;
      if (!body?.model || !body?.input || typeof body.input !== "object") {
        return Response.json({ error: "Invalid AI request." }, { status: 400 });
      }
      const ai = env.AI as { run: (name: string, values: Record<string, unknown>) => Promise<unknown> };
      const result = await ai.run(body.model, body.input);
      return Response.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  },
};
