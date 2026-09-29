import type { Handler, HandlerEvent } from "@netlify/functions";

type SignupPayload = {
  user?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
};

const handler: Handler = async (event: HandlerEvent) => {
  let payload: SignupPayload = {};
  try {
    payload = JSON.parse(event.body || "{}") as SignupPayload;
  } catch {
    payload = {};
  }
  const user = payload.user ?? {};
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: { ...user.app_metadata },
      user_metadata: { ...user.user_metadata },
    }),
  };
};

export { handler };
