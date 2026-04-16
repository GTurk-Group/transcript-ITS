/**
 * Unauthorized page.
 *
 * Shown when a user is authenticated but lacks the required role
 * for the route they attempted to access.
 */

import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Access denied — Transcript Management System",
};

export default async function UnauthorizedPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-red-100 p-4">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </div>

      <h1 className="mt-4 text-lg font-semibold text-gray-900">
        Access denied
      </h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Your account{session ? ` (${session.role.replace("_", " ")})` : ""} does
        not have permission to access this page. Contact a super admin if you
        believe this is an error.
      </p>

      <a
        href="/dashboard"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Return to dashboard
      </a>
    </div>
  );
}
