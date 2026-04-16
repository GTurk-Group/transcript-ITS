/**
 * /profile — Change your own password.
 * Available to all authenticated roles.
 */

"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";
import type { ActionState } from "@/types/auth";

const initialState: ActionState = { status: "idle" };

export default function ProfilePage() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your profile</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Change your password below.
        </p>
      </div>

      <form action={action}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

        <Field label="Current password">
          <input type="password" name="currentPassword" required autoComplete="current-password"
            className={inputCls} />
        </Field>

        <Field label="New password" hint="At least 8 characters">
          <input type="password" name="newPassword" required autoComplete="new-password"
            className={inputCls} />
        </Field>

        <Field label="Confirm new password">
          <input type="password" name="confirmPassword" required autoComplete="new-password"
            className={inputCls} />
        </Field>

        {state.status === "error" && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {state.error}
          </p>
        )}

        {state.status === "success" && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            Password changed successfully.
          </p>
        )}

        <button type="submit" disabled={pending}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900">
          {pending ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
