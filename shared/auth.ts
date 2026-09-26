export function hasAdminRole(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.roles?.includes("admin") ?? false;
}
