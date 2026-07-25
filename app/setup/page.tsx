/**
 * /setup — First-time admin setup.
 *
 * Only accessible when the admins table has zero rows.
 * Once an admin exists, this page redirects to /login permanently.
 *
 * This prevents brute-force account creation after the system is live.
 */

import { redirect } from "next/navigation";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { SetupForm } from "./_components/setup-form";

export const metadata = { title: "First-time setup — TMS" };

export default async function SetupPage() {
    // If any admin already exists, setup is locked
    try {
        const existing = await db.select({ id: admins.id }).from(admins).limit(1);
        if (existing.length > 0) {
            redirect("/login");
        }
    } catch {
        // DB not reachable — show the form anyway so the user sees the DB error
        // via the form action rather than a crash page
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-8">

                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none">
                        <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to TMS</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        No admin account exists yet. Create your Super Admin account to get started.
                    </p>
                </div>

                {/* Notice */}
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span>
                        This page is only available when no admins exist.
                        It will be permanently locked once your account is created.
                    </span>
                </div>

                {/* Form */}
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <SetupForm />
                </div>
            </div>
        </div>
    );
}