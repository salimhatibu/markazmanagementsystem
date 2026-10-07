const DEFAULT_PUBLIC_HOST = "mysalafimindset.com";
const DEFAULT_ADMIN_HOST = "admin.mysalafimindset.com";

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

export function configuredPublicHost(): string {
  return stripWww((import.meta.env.VITE_PUBLIC_HOST as string | undefined)?.trim() || DEFAULT_PUBLIC_HOST).toLowerCase();
}

export function configuredAdminHost(): string {
  return stripWww((import.meta.env.VITE_ADMIN_HOST as string | undefined)?.trim() || DEFAULT_ADMIN_HOST).toLowerCase();
}

export function publicOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && isPublicHost()) return window.location.origin;
  return `https://${configuredPublicHost()}`;
}

export function adminOrigin(): string {
  const fromEnv = (import.meta.env.VITE_ADMIN_ORIGIN as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && isAdminHost()) return window.location.origin;
  return `https://${configuredAdminHost()}`;
}

export function currentHost(): string {
  if (typeof window === "undefined") return "";
  return stripWww(window.location.hostname.toLowerCase());
}

export function isPublicHost(): boolean {
  return currentHost() === configuredPublicHost();
}

export function isAdminHost(): boolean {
  return currentHost() === configuredAdminHost();
}

/** Localhost / workers.dev cutover host — path-based /read still works. */
export function isLegacyHost(): boolean {
  return !isPublicHost() && !isAdminHost();
}

/** True when this browser tab should show the public papers SPA. */
export function isPublicSurface(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): boolean {
  if (isPublicHost()) return true;
  if (isAdminHost()) return false;
  return pathname === "/read" || pathname.startsWith("/read/");
}

/** Absolute or same-origin href to the papers shelf. */
export function publicShelfHref(): string {
  if (isPublicHost()) return "/";
  if (isLegacyHost()) return "/read";
  return `${publicOrigin()}/`;
}

export function publicPostHref(slug: string): string {
  if (isPublicHost()) return `/${slug}`;
  if (isLegacyHost()) return `/read/${slug}`;
  return `${publicOrigin()}/${slug}`;
}

export function publicSeriesHref(slug: string): string {
  if (isPublicHost()) return `/series/${slug}`;
  if (isLegacyHost()) return `/read/series/${slug}`;
  return `${publicOrigin()}/series/${slug}`;
}

export function publicSavedHref(): string {
  if (isPublicHost()) return "/saved";
  if (isLegacyHost()) return "/read/saved";
  return `${publicOrigin()}/saved`;
}
