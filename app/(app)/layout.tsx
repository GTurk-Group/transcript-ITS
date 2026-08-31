/**
 * Root authenticated layout.
 *
 * Wraps every (app)/* page in:
 *   - Auth guard (requireAuth)
 *   - AppShell (sidebar + topbar)
 *   - ToastProvider (global toast system)
 */

import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/rbac";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const headerStore = await headers();
  const pathname = headerStore.get("x-invoke-path") ?? "/dashboard";

  return (
    <ToastProvider>
      <AppShell session={session} pathname={pathname}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
