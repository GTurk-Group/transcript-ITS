/**
 * /bulk — Bulk upload hub.
 * Redirects VIEWER to unauthorized; shows links to student and grade upload.
 */

import { requirePermission } from "@/lib/auth/rbac";
import type { Metadata }     from "next";

export const metadata: Metadata = { title: "Bulk upload — TMS" };

export default async function BulkHubPage() {
  await requirePermission("bulk_upload");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bulk upload</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Import students or results from CSV files. Valid rows are always
          committed even when other rows in the same file fail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/bulk/upload"
          className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <UsersIcon />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                Student upload
              </h2>
              <p className="text-xs text-gray-500">indexNumber, name, programme, level…</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Import multiple student records at once. Existing index numbers are rejected.
          </p>
        </a>

        <a
          href="/bulk/grades"
          className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <ClipboardIcon />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">
                Grade upload
              </h2>
              <p className="text-xs text-gray-500">indexNumber, courseCode, semester, grade…</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Import semester results. Grade points and quality points are computed server-side.
          </p>
        </a>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
        <span className="font-medium">Need the templates?</span>{" "}
        <a href="/templates" className="text-blue-600 hover:underline">
          Download CSV templates →
        </a>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}
