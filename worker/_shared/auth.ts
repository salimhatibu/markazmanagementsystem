import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv } from "../env";
import { fail } from "./http";
import { currentRequest } from "./request";

export type AccessIdentity = {
  email: string;
  name?: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksTeam = "";

function accessJwks(teamDomain: string) {
  if (!jwks || jwksTeam !== teamDomain) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksTeam = teamDomain;
  }
  return jwks;
}

export async function requireAdmin(_req?: Request): Promise<Response | null> {
  const req = _req ?? currentRequest();
  const env = getEnv();
  if (env.DEV_OPEN_DESK === "1") return null;

  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const aud = env.CF_ACCESS_AUD?.trim();
  if (!team || !aud) return fail("The desk is locked until Cloudflare Access is configured.", 503);

  const token = req.headers.get("Cf-Access-Jwt-Assertion") ?? req.headers.get("cf-access-jwt-assertion");
  if (!token) return fail("Sign in to continue.", 401);

  try {
    const { payload } = await jwtVerify(token, accessJwks(team), {
      issuer: `https://${team}`,
      audience: aud,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return fail("Sign in to continue.", 401);
    return null;
  } catch {
    return fail("Sign in to continue.", 401);
  }
}

export async function readAccessIdentity(req?: Request): Promise<AccessIdentity | null> {
  const request = req ?? currentRequest();
  const env = getEnv();
  if (env.DEV_OPEN_DESK === "1") {
    return { email: "keeper@local.dev", name: "Local keeper" };
  }
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const aud = env.CF_ACCESS_AUD?.trim();
  const token = request.headers.get("Cf-Access-Jwt-Assertion") ?? request.headers.get("cf-access-jwt-assertion");
  if (!team || !aud || !token) return null;
  try {
    const { payload } = await jwtVerify(token, accessJwks(team), {
      issuer: `https://${team}`,
      audience: aud,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return null;
    const name = typeof payload.name === "string" ? payload.name : undefined;
    return { email, name };
  } catch {
    return null;
  }
}
