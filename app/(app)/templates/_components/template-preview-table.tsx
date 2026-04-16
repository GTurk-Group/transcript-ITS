/**
 * TemplatePreviewTable — server component.
 *
 * Renders the first few rows of a template as an HTML table so admins
 * can see the exact format before downloading.
 *
 * Pure RSC — no client-side JS.
 */

import { generateStudentTemplate, generateGradesTemplate } from "@/lib/templates";

type Props = {
  type: "students" | "grades";
};

export function TemplatePreviewTable({ type }: Props) {
  const raw  = type === "students" ? generateStudentTemplate() : generateGradesTemplate();
  const rows = parseTemplateForPreview(raw);

  if (rows.length === 0) return null;

  const [headerRow, ...dataRows] = rows;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              {headerRow.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dataRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-2 font-mono text-gray-700">
                    {cell === "" ? (
                      <span className="italic text-gray-400">empty</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Parse template for preview ───────────────────────────────────────────────

/**
 * Extract the header row and data rows from a generated template string.
 * Strips comment lines (starting with #) and the BOM.
 * Returns at most 10 rows (header + 9 data) — we only need a preview.
 */
function parseTemplateForPreview(template: string): string[][] {
  const clean = template.startsWith("\uFEFF") ? template.slice(1) : template;

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"))
    .slice(0, 10);

  return lines.map((line) => {
    // Simple split — template values are clean and don't need full RFC 4180 parsing
    return line.split(",").map((f) => f.replace(/^"|"$/g, "").replace(/""/g, '"'));
  });
}
