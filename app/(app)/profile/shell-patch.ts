/**
 * AppShell additions for production:
 *   - Profile link in sidebar (for password change)
 *   - /profile added to PROTECTED_PREFIXES in lib/auth/config.ts
 *
 * Add this nav item to the sidebar items array in app-shell.tsx,
 * just above the sign-out button in the sidebar footer:
 *
 * { href: "/profile", label: "My profile", icon: <ProfileIcon /> }
 *
 * And add the icon component:
 */

// ─── Profile icon (add to app-shell.tsx icon definitions) ────────────────────

export function ProfileIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

/**
 * ─── PATCH for lib/auth/config.ts ────────────────────────────────────────────
 *
 * Add "/profile" to PROTECTED_PREFIXES:
 *
 * export const PROTECTED_PREFIXES = [
 *   "/dashboard",
 *   "/students",
 *   "/grades",
 *   "/transcripts",
 *   "/bulk",
 *   "/admin",
 *   "/audit",
 *   "/programmes",
 *   "/courses",
 *   "/semesters",
 *   "/templates",
 *   "/profile",      ← ADD THIS
 * ] as const;
 */
