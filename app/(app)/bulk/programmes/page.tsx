/**
 * /bulk/programmes — Bulk upload academic programmes.
 * CSV columns: name, code
 */
import { requirePermission } from "@/lib/auth/rbac";
import { BulkGenericForm } from "@/components/bulk/generic-form";

export const metadata = { title: "Bulk programme import — TMS" };

export default async function BulkProgrammesPage() {
    await requirePermission("manage_programmes");
    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bulk programme import</h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Upload a CSV to register multiple academic programmes at once.
                </p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
                <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-3">CSV format</h2>
                <div className="rounded-lg bg-white/60 dark:bg-black/20 p-3 font-mono text-xs text-indigo-800 dark:text-indigo-300 mb-3">
                    <p className="font-semibold mb-1">Required columns:</p>
                    <p>name,code</p>
                    <p className="mt-2 font-semibold">Example rows:</p>
                    <p>Bachelor of Science in Computer Science,BSC_CS</p>
                    <p>Bachelor of Education in Mathematics,BED_MATH</p>
                    <p>Diploma in Information Technology,DIT</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-indigo-700 dark:text-indigo-400">• <strong>name</strong> — full programme title (unique)</span>
                    <span className="text-indigo-700 dark:text-indigo-400">• <strong>code</strong> — short code (unique)</span>
                </div>
                <a href="/api/templates/programmes"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download template CSV
                </a>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <BulkGenericForm
                    endpoint="/api/bulk/programmes/upload"
                    successHref="/programmes"
                    successLabel="View programmes"
                />
            </div>
        </div>
    );
}