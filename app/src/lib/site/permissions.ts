// Server gate (requirePermission) layered on the existing requireAdmin() 2FA
// gate. The pure matrix lives in roles.ts (client-safe); re-exported here so
// existing imports from "@/lib/site/permissions" keep working.

import { requireAdmin, type AdminSession } from "@/lib/admin-auth";
import { hasPermission } from "./roles";
import type { Permission } from "./types";

export { hasPermission, effectiveRole } from "./roles";

/**
 * Full gate for builder API routes: requireAdmin() (session + admin + 2FA) AND
 * the given permission. Returns the session on success, or null on failure —
 * callers respond with jsonError/unauthorized, matching the existing pattern.
 */
export async function requirePermission(
  perm: Permission,
): Promise<AdminSession | null> {
  const session = await requireAdmin();
  if (!session) return null;
  if (!hasPermission(session.profile.admin_role, perm)) return null;
  return session;
}
