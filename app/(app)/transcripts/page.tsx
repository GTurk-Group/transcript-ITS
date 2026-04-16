/**
 * /transcripts — Transcript list and student search.
 * Dark-mode-aware. Fully responsive.
 */

import { requireAuth, can } from "@/lib/auth/rbac";
import { db } from "@/db";
import { students, transcripts, programmes } from "@/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transcripts — TMS" };
type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function TranscriptsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const { q } = await searchParams;
  const canGen = can(session, "generate_transcripts");  // true for VIEWER too now

  const [recent, searchResults] = await Promise.all([
    db.select({ id: transcripts.id, transcriptNumber: transcripts.transcriptNumber, createdAt: transcripts.createdAt, studentId: transcripts.studentId, idx: students.indexNumber, first: students.firstName, last: students.lastName, prog: programmes.name })
      .from(transcripts)
      .innerJoin(students, eq(transcripts.studentId, students.id))
      .innerJoin(programmes, eq(students.programmeId, programmes.id))
      .orderBy(desc(transcripts.createdAt))
      .limit(50),

    q?.trim()
      ? db.select({ id: students.id, indexNumber: students.indexNumber, firstName: students.firstName, lastName: students.lastName, programmeName: programmes.name })
        .from(students)
        .innerJoin(programmes, eq(students.programmeId, programmes.id))
        .where(or(ilike(students.indexNumber, `%${q}%`), ilike(students.firstName, `%${q}%`), ilike(students.lastName, `%${q}%`)))
        .limit(20)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transcripts</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {canGen ? "Search for a student to view or generate their transcript." : "Search for a student to view their transcript."}
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">Find student</h2>
        <form method="GET" className="flex gap-3">
          <input name="q" type="search" defaultValue={q} placeholder="Search by name or index number…" autoComplete="off"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900">
            Search
          </button>
        </form>
        {q && searchResults.length === 0 && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No students found for &ldquo;{q}&rdquo;.</p>}
        {searchResults.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
            {searchResults.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</span>
                  <span className="ml-2 text-xs text-gray-500">{s.indexNumber}</span>
                  <span className="ml-2 text-xs text-gray-400">{s.programmeName}</span>
                </div>
                <a href={`/transcripts/${s.id}`} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                  View / Generate →
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>


      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Recent transcripts</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30">No transcripts generated yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Reference", "Student", "Programme", "Generated", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recent.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{t.transcriptNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t.first} {t.last}</p>
                        <p className="text-xs text-gray-500">{t.idx}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.prog}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a href={`/transcripts/${t.studentId}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">History</a>
                          <a href={`/api/transcript/${t.id}`} target="_blank" rel="noopener" className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">Open PDF</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}