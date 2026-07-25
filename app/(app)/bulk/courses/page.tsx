/**
 * /bulk/courses — Bulk upload courses.
 * CSV columns: code, title, credit_hours, is_scoring
 */
import { requirePermission } from "@/lib/auth/rbac";
import { BulkGenericForm } from "@/components/bulk/generic-form";

export const metadata = { title: "Bulk course import — TMS" };

export default async function BulkCoursesPage() {
    await requirePermission("manage_courses");
    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bulk course import</h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Upload a CSV to register multiple courses at once.
                </p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
                <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-3">CSV format</h2>
                <div className="rounded-lg bg-white/60 dark:bg-black/20 p-3 font-mono text-xs text-indigo-800 dark:text-indigo-300 mb-3">
                    <p className="font-semibold mb-1">Required columns:</p>
                    <p>code,title,credit_hours,is_scoring</p>
                    <p className="mt-2 font-semibold">Example rows:</p>
                    <p>MATH101,Introduction to Mathematics,3,true</p>
                    <p>ENG101,English Language and Communication,3,true</p>
                    <p>PE101,Physical Education,2,false</p>
                    <p>PROJ600,Final Year Project,24,true</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-indigo-700 dark:text-indigo-400">
                    <span>• <strong>code</strong> — unique course code</span>
                    <span>• <strong>title</strong> — full course title</span>
                    <span>• <strong>credit_hours</strong> — number (e.g. 2, 3, 6, 18, 24)</span>
                    <span>• <strong>is_scoring</strong> — true or false</span>
                </div>
                <a href="/api/templates/courses"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download template CSV
                </a>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <BulkGenericForm
                    endpoint="/api/bulk/courses/upload"
                    successHref="/courses"
                    successLabel="View courses"
                />
            </div>
        </div>
    );
}