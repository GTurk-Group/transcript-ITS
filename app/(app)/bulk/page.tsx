/**
 * /bulk — Bulk upload hub.
 * Links to all bulk upload pages.
 */
import { requireAuth, can } from "@/lib/auth/rbac";

export const metadata = { title: "Bulk upload — TMS" };

export default async function BulkPage() {
  const session = await requireAuth();

  const cards = [
    {
      href: "/bulk/upload",
      title: "Student import",
      desc: "Upload a CSV to register multiple students at once.",
      icon: "👥",
      show: can(session, "bulk_upload"),
    },
    {
      href: "/bulk/grades",
      title: "Grade import",
      desc: "Upload semester results for multiple students.",
      icon: "📊",
      show: can(session, "bulk_upload"),
    },
    {
      href: "/bulk/programmes",
      title: "Programme import",
      desc: "Upload a CSV to register multiple academic programmes.",
      icon: "🎓",
      show: can(session, "manage_programmes"),
    },
    {
      href: "/bulk/courses",
      title: "Course import",
      desc: "Upload a CSV to add multiple courses at once.",
      icon: "📚",
      show: can(session, "manage_courses"),
    },
  ].filter(c => c.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bulk upload</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Import large datasets via CSV files. Download the template for each type to see the required format.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <a key={card.href} href={card.href}
            className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700">
            <span className="text-3xl">{card.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{card.title}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Tips for all uploads</h2>
        <ul className="space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
          <li>• Save your spreadsheet as CSV (comma-separated) before uploading.</li>
          <li>• Download the template first — it shows the exact column names needed.</li>
          <li>• Maximum 5 MB / 2,000 rows per upload. Split larger files into batches.</li>
          <li>• Rows with errors are skipped but reported — valid rows are still imported.</li>
          <li>• Duplicate codes or names are automatically detected and skipped.</li>
        </ul>
      </div>
    </div>
  );
}