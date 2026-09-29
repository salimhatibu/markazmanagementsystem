export function stringRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function hasAdminRole(roles: unknown, appMetadata?: unknown): boolean {
  const fromRoles = stringRoles(roles);
  const meta =
    appMetadata && typeof appMetadata === "object" ? (appMetadata as { roles?: unknown }).roles : undefined;
  return fromRoles.includes("admin") || stringRoles(meta).includes("admin");
}
