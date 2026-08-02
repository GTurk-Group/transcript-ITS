"use client";

import { useActionState } from "react";
import { setupAdminAction } from "@/actions/setup";
import type { ActionState } from "@/types/auth";

const initialState: ActionState<{ name: string; email: string; password: string; confirmPassword: string } | undefined> = { status: "idle" };

export function SetupForm() {
    const [state, formAction, isPending] = useActionState(setupAdminAction, initialState);

    if (state.status === "success") {
        return (
            <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                    <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account created!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your Super Admin account is ready. Redirecting to sign in…
                </p>
                <a href="/login"
                    className="mt-2 inline-block w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 text-center">
                    Go to sign in →
                </a>
            </div>
        );
    }

    return (
        <form action={formAction} noValidate className="space-y-5">

            {state.status === "error" ? (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H2.645c-1.73 0-2.813-1.874-1.948-3.374L10.05 3.378c.866-1.5 3.032-1.5 3.898 0l7.355 12.748z" />
                    </svg>
                    {state.error}
                </div>
            ) : null}

            <Field label="Full name" error={state.status === "error" ? state.fieldErrors?.name?.[0] : undefined}>
                <input name="name" type="text" autoComplete="name" required disabled={isPending}
                    placeholder="Dr. Kofi Mensah"
                    className={inputCls(state.status === "error" ? !!state.fieldErrors?.name : false)} />
            </Field>

            <Field label="Email address" error={state.status === "error" ? state.fieldErrors?.email?.[0] : undefined}>
                <input name="email" type="email" autoComplete="email" required disabled={isPending}
                    placeholder="admin@institution.edu"
                    className={inputCls(state.status === "error" ? !!state.fieldErrors?.email : false)} />
            </Field>

            <Field label="Password" hint="At least 8 characters"
                error={state.status === "error" ? state.fieldErrors?.password?.[0] : undefined}>
                <input name="password" type="password" autoComplete="new-password" required disabled={isPending}
                    placeholder="••••••••"
                    className={inputCls(state.status === "error" ? !!state.fieldErrors?.password : false)} />
            </Field>

            <Field label="Confirm password"
                error={state.status === "error" ? state.fieldErrors?.confirmPassword?.[0] : undefined}>
                <input name="confirmPassword" type="password" autoComplete="new-password" required disabled={isPending}
                    placeholder="••••••••"
                    className={inputCls(state.status === "error" ? !!state.fieldErrors?.confirmPassword : false)} />
            </Field>

            <button type="submit" disabled={isPending}
                className={[
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                    "text-sm font-semibold text-white transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isPending ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}>
                {isPending ? (
                    <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating account…
                    </>
                ) : "Create Super Admin account"}
            </button>
        </form>
    );
}

function inputCls(hasError: boolean) {
    return [
        "block w-full rounded-xl border px-4 py-3 text-sm transition-colors",
        "placeholder:text-gray-400 dark:placeholder:text-gray-600",
        "focus:outline-none focus:ring-2 focus:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "dark:bg-gray-900 dark:text-gray-100",
        hasError
            ? "border-red-400 focus:ring-red-300 dark:border-red-700"
            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 dark:border-gray-700",
    ].join(" ");
}

function Field({ label, hint, error, children }: {
    label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            {children}
            {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}