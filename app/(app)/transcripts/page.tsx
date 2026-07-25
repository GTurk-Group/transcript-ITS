/**
 * /transcripts — Search and view transcripts inline.
 *
 * When a student is found by index number or name, their transcript
 * assembles and renders on THIS page — no navigation required.
 *
 * URL pattern:
 *   /transcripts          → search prompt
 *   /transcripts?q=CS001  → inline transcript for matched student
 *                           (if single match) or list (if multiple)
 */

import { requireAuth, can } from "@/lib/auth/rbac";
import { db } from "@/db";
import { students, transcripts, programmes } from "@/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import { assembleTranscript } from "@/lib/transcript";
import {
  TranscriptPreview,
  TranscriptActionBar,
} from "@/components/transcript";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transcripts — TMS" };

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function TranscriptsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const canGen = can(session, "generate_transcripts");

  // ── If search query, find matching students ─────────────────────────────────
  let matchedStudents: { id: string; indexNumber: string; firstName: string; middleName: string | null; lastName: string; programmeName: string | null }[] = [];

  if (query) {
    matchedStudents = await db
      .select({
        id: students.id,
        indexNumber: students.indexNumber,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        programmeName: programmes.name,
      })
      .from(students)
      .leftJoin(programmes, eq(students.programmeId, programmes.id))
      .where(
        or(
          ilike(students.indexNumber, `%${query}%`),
          ilike(students.firstName, `%${query}%`),
          ilike(students.lastName, `%${query}%`),
        )
      )
      .limit(10);
  }

  // ── Auto-load transcript when exactly one student matches ───────────────────
  let inlineTranscript: Awaited<ReturnType<typeof assembleTranscript>> | null = null;
  let inlineLatestRecord: { id: string; transcriptNumber: string; createdAt: Date } | null = null;

  if (matchedStudents.length === 1) {
    const studentId = matchedStudents[0].id;

    const [assembled, records] = await Promise.all([
      assembleTranscript(studentId),
      db.select({ id: transcripts.id, transcriptNumber: transcripts.transcriptNumber, createdAt: transcripts.createdAt })
        .from(transcripts)
        .where(eq(transcripts.studentId, studentId))
        .orderBy(desc(transcripts.createdAt))
        .limit(1),
    ]);

    inlineTranscript = assembled;
    inlineLatestRecord = records[0] ?? null;
  }

  // ── Recent transcript history ───────────────────────────────────────────────
  const recent = await db
    .select({
      id: transcripts.id,
      transcriptNumber: transcripts.transcriptNumber,
      createdAt: transcripts.createdAt,
      studentId: transcripts.studentId,
      idx: students.indexNumber,
      first: students.firstName,
      last: students.lastName,
      prog: programmes.name,
    })
    .from(transcripts)
    .innerJoin(students, eq(transcripts.studentId, students.id))
    .innerJoin(programmes, eq(students.programmeId, programmes.id))
    .orderBy(desc(transcripts.createdAt))
    .limit(20);

  // ── When inline transcript loaded, show it full-width ──────────────────────
  if (inlineTranscript?.ok) {
    const { transcript } = inlineTranscript;
    const latestRef = inlineLatestRecord;

    const displayTranscript = latestRef
      ? { ...transcript, transcriptNumber: latestRef.transcriptNumber, generatedAt: latestRef.createdAt.toISOString() }
      : { ...transcript, transcriptNumber: "PREVIEW", generatedAt: new Date().toISOString() };

    return (
      <div>
        {/* Action bar with search input inline */}
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900" data-print-hide>
          <form method="GET" className="flex flex-1 max-w-md gap-2">
            <input name="q" type="search" defaultValue={query} autoFocus
              placeholder="Search by name or index number…"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
            <button type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Search
            </button>
          </form>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <PrintIcon />Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Inline action bar for record */}
        <TranscriptActionBar
          studentId={matchedStudents[0].id}
          studentName={transcript.student.fullName}
          canGenerate={canGen}
          latestRecordId={latestRef?.id ?? null}
        />

        {/* Inline transcript preview */}
        <TranscriptPreview
          transcript={displayTranscript}
          latestRecordId={latestRef?.id ?? null}
        />
      </div>
    );
  }

  // ── Error assembling transcript ─────────────────────────────────────────────
  if (inlineTranscript && !inlineTranscript.ok) {
    return (
      <div className="space-y-6">
        <SearchBar query={query} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {inlineTranscript.error.message}
        </div>
      </div>
    );
  }

  // ── Default view: search + results list + recent history ───────────────────
  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transcripts</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Search by student name or index number — the transcript loads instantly.
        </p>
      </div>

      {/* Search */}
      <SearchBar query={query} autoFocus />

      {/* Multiple results list */}
      {query && matchedStudents.length > 1 && (
        <section>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {matchedStudents.length} students matched &ldquo;{query}&rdquo; — select one:
          </p>
          <div className="space-y-2">
            {matchedStudents.map((s) => (
              <a key={s.id}
                href={`/transcripts?q=${encodeURIComponent(s.indexNumber)}`}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{s.indexNumber}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">{s.programmeName}</p>
                </div>
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* No results */}
      {query && matchedStudents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No students found</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Recent transcripts */}
      {recent.length > 0 && !query && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Recent transcripts</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Reference", "Student", "Programme", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recent.map((t) => (
                  <tr key={t.id}
                    className="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                    onClick={() => { window.location.href = `/transcripts?q=${encodeURIComponent(t.idx)}`; }}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{t.transcriptNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t.first} {t.last}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.idx}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.prog}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SearchBar({ query, autoFocus }: { query: string; autoFocus?: boolean }) {
  return (
    <form method="GET" className="flex gap-3 max-w-lg">
      <input name="q" type="search" defaultValue={query}
        autoFocus={autoFocus}
        placeholder="Index number or student name…"
        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
      <button type="submit"
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 dark:shadow-none">
        Search
      </button>
    </form>
  );
}

function PrintIcon() {
  return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>;
}