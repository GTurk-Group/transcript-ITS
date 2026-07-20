"use client";

import { useActionState, useEffect, useRef } from "react";
import { loginAction } from "@/actions/auth";
import type { ActionState } from "@/types/auth";

const initialState: ActionState = { status: "idle" };

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  const generalError = state.status === "error" && !state.fieldErrors ? state.error : undefined;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {generalError && (
        <div role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {generalError}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
        <input
          ref={emailRef} id="email" name="email" type="email"
          autoComplete="email" required disabled={isPending}
          suppressHydrationWarning placeholder="admin@institution.edu"
          className={[
            "block w-full rounded-xl border px-4 py-3 text-sm transition-colors",
            "placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:bg-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-60",
            fieldErrors?.email
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 dark:border-gray-700",
          ].join(" ")}
        />
        {fieldErrors?.email && <p className="text-xs text-red-600">{fieldErrors.email[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
        <input
          id="password" name="password" type="password"
          autoComplete="current-password" required disabled={isPending}
          suppressHydrationWarning placeholder="••••••••"
          className={[
            "block w-full rounded-xl border px-4 py-3 text-sm transition-colors",
            "placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:bg-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-60",
            fieldErrors?.password
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 dark:border-gray-700",
          ].join(" ")}
        />
        {fieldErrors?.password && <p className="text-xs text-red-600">{fieldErrors.password[0]}</p>}
      </div>

      <button type="submit" disabled={isPending}
        className={[
          "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
          "text-sm font-semibold text-white shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isPending ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800",
        ].join(" ")}>
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : "Sign in"}
      </button>
    </form>
  );
}