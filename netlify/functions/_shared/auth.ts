import { getIdentityConfig, getUser } from "@netlify/identity";
import { hasAdminRole } from "../../../shared/roles";
import { fail } from "./http";

function envValue(name: string): string | undefined {
  const fromNetlify = typeof Netlify !== "undefined" ? Netlify.env.get(name) : undefined;
  return fromNetlify ?? process.env[name];
}

function hostedDeploy(): boolean {
  const context = envValue("CONTEXT") ?? "";
  return context === "production" || context === "deploy-preview" || context === "branch-deploy";
}

export async function requireAdmin(): Promise<Response | null> {
  if (!hostedDeploy()) return null;
  const config = getIdentityConfig();
  if (!config) return fail("The desk is locked until Identity is enabled.", 503);
  const user = await getUser();
  if (!user) return fail("Sign in to continue.", 401);
  if (!hasAdminRole(user.roles, user.appMetadata)) {
    return fail("This desk is only for the Markaz keepers.", 403);
  }
  return null;
}
