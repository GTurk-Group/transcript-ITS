"use client";

/**
 * Login form — client component.
 *
 * Uses React 19 useActionState to connect to the loginAction server action.
 * Handles field-level validation errors, general errors, and loading state.
 */

import { useActionState, useEffect, useRef } from "react";
import { loginAction } from "@/actions/auth";
import type { ActionState } from "@/types/auth";

const initialState: ActionState = { status: "idle" };

type LoginFormProps = {
  /** Validated, relative callbackUrl from the page's searchParams. */
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  // Focus the email input on mount for keyboard accessibility
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const fieldErrors =
    state.status === "error" ? state.fieldErrors : undefined;
  const generalError =
    state.status === "error" && !fieldErrors ? state.error : undefined;

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Hidden callbackUrl — validated server-side against open redirects */}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* General error banner */}
      {generalError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {generalError}
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          aria-describedby={
            fieldErrors?.email ? "email-error" : undefined
          }
          aria-invalid={!!fieldErrors?.email}
          className={[
            "block w-full rounded-md border px-3 py-2 text-sm shadow-sm",
            "placeholder:text-gray-400 focus:outline-none focus:ring-2",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
            fieldErrors?.email
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-blue-500",
          ].join(" ")}
          placeholder="admin@institution.edu"
        />
        {fieldErrors?.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          aria-describedby={
            fieldErrors?.password ? "password-error" : undefined
          }
          aria-invalid={!!fieldErrors?.password}
          className={[
            "block w-full rounded-md border px-3 py-2 text-sm shadow-sm",
            "placeholder:text-gray-400 focus:outline-none focus:ring-2",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
            fieldErrors?.password
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-blue-500",
          ].join(" ")}
          placeholder="••••••••"
        />
        {fieldErrors?.password && (
          <p id="password-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={[
          "flex w-full items-center justify-center rounded-md px-4 py-2.5",
          "text-sm font-medium text-white shadow-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isPending
            ? "bg-blue-400"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
        ].join(" ")}
      >
        {isPending ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">Signing in…</span>
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
