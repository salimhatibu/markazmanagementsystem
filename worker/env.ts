export type WorkerEnv = {
  DB: D1Database;
  REPORTS: R2Bucket;
  BLOG_MEDIA: R2Bucket;
  AI: Ai;
  ASSETS: Fetcher;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MARKAZ_FROM?: string;
  /** Cloudflare Access team domain, e.g. markaz.cloudflareaccess.com */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access application AUD tag */
  CF_ACCESS_AUD?: string;
  /** When "1", admin checks are skipped (local wrangler dev). */
  DEV_OPEN_DESK?: string;
  SITE_URL?: string;
};

let activeEnv: WorkerEnv | null = null;

export function bindEnv(env: WorkerEnv): void {
  activeEnv = env;
}

export function getEnv(): WorkerEnv {
  if (!activeEnv) throw new Error("Worker env is not bound for this request.");
  return activeEnv;
}
