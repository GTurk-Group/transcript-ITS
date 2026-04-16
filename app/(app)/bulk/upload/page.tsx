/**
 * /bulk/upload — Bulk student upload page.
 *
 * ADMIN+ only. Provides:
 *   - Template CSV download link
 *   - Column format instructions
 *   - The upload form component
 */

import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/rbac";
import { BulkUploadForm }    from "./_components/upload-form";
import { getProgrammes }     from "@/actions/crud/programmes";
import { TemplateDownloadButton } from "@/app/(app)/templates/_components/template-download-button";

export const metadata: Metadata = {
  title: "Bulk upload — Transcript Management System",
};

export default async function BulkUploadPage() {
  await requirePermission("bulk_upload");

  // Show available programme codes so users know what values to use
  const programmes = await getProgrammes();
  const activeCodes = programmes
    .filter((p) => p.isActive)
    .map((p) => p.code)
    .slice(0, 20); // cap at 20 for display

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bulk student upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import multiple students from a CSV file. Valid rows are imported
          immediately; failed rows are reported with specific error messages.
          The upload does not stop on partial errors.
        </p>
      </div>

      {/* Instructions card */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Prepare your file</h2>
            <p className="mt-1 text-sm text-gray-500">
              Download the template, fill in your data, and upload the CSV.
            </p>
          </div>
          <TemplateDownloadButton
            endpoint="/api/templates/students"
            filename="student-upload-template.csv"
            label="Download template"
            size="sm"
          />
        </div>

        {/* Column reference */}
        <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Column", "Required", "Format / Notes"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {[
                ["indexNumber",    true,  "Unique student identifier, e.g. CS/2021/001"],
                ["firstName",      true,  "Student's first name"],
                ["lastName",       true,  "Student's last (family) name"],
                ["programmeCode",  true,  `Must match an active programme: ${activeCodes.join(", ")}${activeCodes.length < programmes.filter(p=>p.isActive).length ? "…" : ""}`],
                ["level",          true,  "One of: 100, 200, 300, 400, 500, 600, 700, 800"],
                ["entryYear",      true,  "4-digit year of admission, e.g. 2021"],
                ["graduationYear", false, "4-digit year, e.g. 2025 — leave blank for current students"],
              ].map(([col, req, note]) => (
                <tr key={col as string}>
                  <td className="px-3 py-2 font-mono font-medium text-gray-800">{col as string}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${req ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {req ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{note as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Limits */}
        <p className="mt-3 text-xs text-gray-400">
          Max file size: 5 MB &middot; Max rows per upload: 5,000 &middot; CSV format only
        </p>
      </section>

      {/* Upload form */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Upload file</h2>
        <BulkUploadForm />
      </section>
    </div>
  );
}
