// Pure (client-safe) admin role → permission matrix. No server imports, so it
// can be used in both client components (nav gating) and server code.

import type { AdminRole, Permission } from "./types";

const MATRIX: Record<AdminRole, Permission[]> = {
  super_admin: [
    "content.read", "content.write", "design.write", "settings.write",
    "code.write", "team.manage", "backup.manage",
  ],
  admin: [
    "content.read", "content.write", "design.write", "settings.write",
    "backup.manage",
  ],
  editor: ["content.read", "content.write"],
  support: ["content.read"],
};

/** Resolve an admin's effective role. Legacy admins with no admin_role set are
 *  treated as super_admin (back-compat — they had full access before roles). */
export function effectiveRole(adminRole: string | null | undefined): AdminRole {
  if (adminRole === "admin" || adminRole === "editor" || adminRole === "support")
    return adminRole;
  return "super_admin";
}

export function hasPermission(
  adminRole: string | null | undefined,
  perm: Permission,
): boolean {
  return MATRIX[effectiveRole(adminRole)].includes(perm);
}
