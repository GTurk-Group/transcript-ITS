/**
 * Auth layout — wraps unauthenticated pages (login).
 *
 * Minimal: no sidebar, no topbar. Just a clean centered background.
 * The login page handles its own card and content.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {children}
    </div>
  );
}
