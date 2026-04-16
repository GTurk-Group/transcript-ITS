/**
 * Server-only RBAC guards.
 *
 * ⚠️  DO NOT import this file in Client Components ("use client").
 *     It imports next/navigation and next/headers (via session.ts),
 *     which are server-only APIs.
 *
 * For permission checks inside Client Components, import `can` from
 * "./permissions" instead — that file has no server dependencies.
 */

import { redirect } from "next/navigation";
import { getSession } from "./session";
import { can, hasMinimumRole } from "./permissions";
import type { AuthenticatedAdmin, Role } from "@/types/auth";

// Re-export everything from permissions so existing server-side imports
// (`import { can, Permission } from "@/lib/auth/rbac"`) keep working unchanged.
export {
  can,
  canAll,
  hasMinimumRole,
  PERMISSION_MAP,
  ROLE_RANK,
} from "./permissions";
export type { Permission } from "./permissions";

export async function requireAuth(): Promise<AuthenticatedAdmin> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(
  minimumRole: Role,
): Promise<AuthenticatedAdmin> {
  const session = await requireAuth();
  if (!hasMinimumRole(session.role, minimumRole)) redirect("/unauthorized");
  return session;
}

export async function requirePermission(
  permission: import("./permissions").Permission,
): Promise<AuthenticatedAdmin> {
  const session = await requireAuth();
  if (!can(session, permission)) redirect("/unauthorized");
  return session;
}

export async function assertPermission(
  permission: import("./permissions").Permission,
): Promise<AuthenticatedAdmin> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (!can(session, permission))
    throw new Error(`FORBIDDEN: requires permission '${permission}'`);
  return session;
}
