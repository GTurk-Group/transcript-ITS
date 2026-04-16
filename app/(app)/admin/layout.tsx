/**
 * Admin section layout — SUPER_ADMIN only.
 *
 * Third layer of role enforcement for the /admin/* route segment:
 *  1. middleware.ts        — redirects non-SUPER_ADMIN before the page renders
 *  2. (app)/layout.tsx     — asserts base authentication
 *  3. (app)/admin/layout   — asserts SUPER_ADMIN role (this file)
 *
 * The triple enforcement means a route is never accessible even if one
 * layer has a configuration or deployment bug.
 */

import { requireRole } from "@/lib/auth/rbac";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireRole("SUPER_ADMIN") calls requireAuth() internally,
  // then checks hasMinimumRole. Redirects to /unauthorized on failure.
  await requireRole("SUPER_ADMIN");

  return (
    <div>
      {/* Section header — only visible to SUPER_ADMIN */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            Super admin
          </span>
          <h1 className="text-lg font-semibold text-gray-900">
            System administration
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Manage system users, institution settings, and grading configuration.
        </p>
      </div>

      {/* Admin sub-navigation */}
      <nav className="mb-6 flex gap-1 border-b border-gray-200">
        <AdminNavLink href="/admin/users">Users</AdminNavLink>
        <AdminNavLink href="/admin/institution">Institution</AdminNavLink>
        <AdminNavLink href="/admin/grading-scale">Grading scale</AdminNavLink>
        <AdminNavLink href="/admin/registrar">Registrar</AdminNavLink>
        <AdminNavLink href="/audit">Audit log</AdminNavLink>
      </nav>

      {children}
    </div>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
    >
      {children}
    </a>
  );
}
