"use client";

/**
 * components/transcript/preview.tsx
 *
 * The canonical location for TranscriptPreview.
 * Imported by:
 *   - app/(app)/transcripts/page.tsx          (search + inline)
 *   - app/(app)/transcripts/[studentId]/page  (detail page)
 *
 * The [studentId]/_components/transcript-preview.tsx re-exports from here.
 */

import { useState, useEffect, useRef } from "react";
import type {
    TranscriptObject,
    TranscriptSemester,
    TranscriptCourse,
    GradeClassification,
} from "@/lib/transcript/types";

const CLASSIFICATION_STYLE: Record<
    GradeClassification,
    { label: string; ring: string; bg: string; text: string; badge: string }
> = {
    // ── Degree classifications ─────────────────────────────────────────────
    "First Class": { label: "First Class Honours", ring: "#16a34a", bg: "bg-green-50", text: "text-green-800", badge: "bg-green-100 text-green-800 border-green-200" },
    "Second Class Upper": { label: "Second Class Honours (Upper)", ring: "#2563eb", bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-100 text-blue-800 border-blue-200" },
    "Second Class Lower": { label: "Second Class Honours (Lower)", ring: "#7c3aed", bg: "bg-purple-50", text: "text-purple-800", badge: "bg-purple-100 text-purple-800 border-purple-200" },
    "Third Class": { label: "Third Class Honours", ring: "#d97706", bg: "bg-amber-50", text: "text-amber-800", badge: "bg-amber-100 text-amber-800 border-amber-200" },
    // ── Diploma classifications ────────────────────────────────────────────
    "Distinction": { label: "Distinction", ring: "#0891b2", bg: "bg-cyan-50", text: "text-cyan-800", badge: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    "Credit": { label: "Credit", ring: "#0369a1", bg: "bg-sky-50", text: "text-sky-800", badge: "bg-sky-100 text-sky-800 border-sky-200" },
    // ── Shared ────────────────────────────────────────────────────────────
    "Pass": { label: "Pass", ring: "#64748b", bg: "bg-slate-50", text: "text-slate-700", badge: "bg-slate-100 text-slate-700 border-slate-200" },
    "Fail": { label: "Fail", ring: "#dc2626", bg: "bg-red-50", text: "text-red-800", badge: "bg-red-100 text-red-800 border-red-200" },
    "No Results": { label: "No Results", ring: "#9ca3af", bg: "bg-gray-50", text: "text-gray-600", badge: "bg-gray-100 text-gray-600 border-gray-200" },
};

const GRADE_PILL: Record<string, string> = {
    "A": "bg-green-100 text-green-800 border border-green-200",
    "B+": "bg-emerald-100 text-emerald-800 border border-emerald-200",
    "B": "bg-teal-100 text-teal-800 border border-teal-200",
    "C+": "bg-yellow-100 text-yellow-800 border border-yellow-200",
    "C": "bg-amber-100 text-amber-700 border border-amber-200",
    "D+": "bg-orange-100 text-orange-700 border border-orange-200",
    "D": "bg-red-50 text-red-700 border border-red-200",
    "F": "bg-red-100 text-red-900 border border-red-300",
};

export type TranscriptPreviewProps = {
    transcript: TranscriptObject;
    latestRecordId: string | null;
};

export function TranscriptPreview({ transcript, latestRecordId }: TranscriptPreviewProps) {
    const { student, institution, registrar, summary, semesters, transcriptNumber, generatedAt, } = transcript;
    const cls = CLASSIFICATION_STYLE[summary.classification];

    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const toggleSemester = (id: string) =>
        setCollapsed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

    const ringRef = useRef<SVGCircleElement>(null);
    const [ringAnimated, setRingAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setRingAnimated(true), 100); return () => clearTimeout(t); }, []);

    const RING_R = 40;
    const RING_C = 2 * Math.PI * RING_R;
    const cgpaFraction = Math.min(summary.cgpa / 4.0, 1);
    const ringOffset = RING_C * (1 - (ringAnimated ? cgpaFraction : 0));

    const generatedDate = new Date(generatedAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
    });

    return (
        <>
            <TranscriptPrintStyles />
            <div id="transcript-document" className="mx-auto w-full max-w-[794px] print:max-w-none" role="main" aria-label="Academic transcript">
                <div className="relative bg-white shadow-2xl print:shadow-none">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 print:block" />
                    <div className="px-10 pb-14 pt-10 print:px-8 print:pb-10 print:pt-8">

                        {/* Header */}
                        <header className="mb-8 flex items-start gap-6 border-b-2 border-slate-800 pb-6 print:mb-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-50 print:h-14 print:w-14">
                                {institution.logoPath
                                    ? <img src={institution.logoPath} alt={`${institution.name} seal`} className="h-12 w-12 object-contain" />
                                    : <SealIcon />}
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900 print:text-lg">{institution.name}</h1>
                                {institution.address && <p className="mt-0.5 text-xs text-slate-500">{institution.address}</p>}
                                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Official Academic Transcript</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                                <p>Ref: <span className="font-mono font-semibold text-slate-700">{transcriptNumber}</span></p>
                                <p className="mt-0.5">Issued: {generatedDate}</p>
                            </div>
                        </header>

                        {/* Student info */}
                        <section className="mb-8 grid grid-cols-2 gap-x-8 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-6 py-4 text-sm print:mb-6">
                            <InfoRow label="Full name" value={student.fullName} bold />
                            <InfoRow label="Programme" value={student.programme.name} />
                            <InfoRow label="Index number" value={student.indexNumber} mono />
                            <InfoRow label="Programme code" value={student.programme.code} />
                            <InfoRow label="Year of entry" value={String(student.entryYear)} />
                            <InfoRow label="Academic level" value={String(student.level)} />
                            {student.dateOfBirth && <InfoRow label="Date of birth" value={student.dateOfBirth as string} />}
                            {student.gender && <InfoRow label="Gender" value={student.gender as string} />}
                            {student.graduationYear && <InfoRow label="Year of completion" value={String(student.graduationYear)} />}
                            <InfoRow label="Status" value={student.status} />
                        </section>

                        {/* Academic results */}
                        <section aria-label="Academic results">
                            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Academic Results</h2>
                            {semesters.length === 0
                                ? <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No grade records on file.</p>
                                : <div className="space-y-4 print:space-y-3">{semesters.map((sem) => (
                                    <SemesterSection key={sem.semesterId} sem={sem} collapsed={collapsed.has(sem.semesterId)} onToggle={() => toggleSemester(sem.semesterId)} />
                                ))}</div>
                            }
                        </section>

                        {/* Cumulative summary */}
                        <section className="mt-8 print:mt-6 print:break-inside-avoid">
                            <div className="overflow-hidden rounded-lg border-2 border-slate-800">
                                <div className="bg-slate-800 px-6 py-3">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-white">Cumulative Academic Summary</h2>
                                </div>
                                <div className="flex items-center gap-8 px-6 py-5 print:py-4">
                                    <div className="relative shrink-0">
                                        <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
                                            <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                            <circle ref={ringRef} cx="50" cy="50" r={RING_R} fill="none" stroke={cls.ring} strokeWidth="8"
                                                strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringOffset}
                                                transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
                                            <text x="50" y="45" textAnchor="middle" style={{ fontFamily: "inherit", fontSize: "14px", fill: "#0f172a", fontWeight: 700 }}>{summary.cgpaFormatted}</text>
                                            <text x="50" y="61" textAnchor="middle" style={{ fontFamily: "inherit", fontSize: "9px", fill: "#64748b" }}>CGPA</text>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4 print:grid-cols-4">
                                            <SummaryCell label="Cr. hrs attempted" value={String(summary.totalCreditsAttempted)} />
                                            <SummaryCell label="Cr. hrs earned" value={String(summary.totalCreditsEarned)} />
                                            <SummaryCell label="Total quality pts" value={summary.totalQualityPoints.toFixed(2)} />
                                            <SummaryCell label="CGPA / 4.00" value={summary.cgpaFormatted} highlight color={cls.ring} />
                                        </div>
                                        <div className="mt-4 print:mt-3">
                                            <span className={`inline-block rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${cls.badge}`}>{cls.label}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Signature */}
                        <section className="mt-10 flex justify-between print:mt-8 print:break-inside-avoid">
                            {registrar ? (
                                <div className="text-center">
                                    <div className="mb-1 flex h-14 w-44 items-end justify-center border-b-2 border-slate-700 print:h-12">
                                        {registrar.signaturePath && <img src={registrar.signaturePath} alt="Registrar signature" className="max-h-12 max-w-full object-contain" />}
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">{registrar.name}</p>
                                    <p className="text-xs text-slate-500">{registrar.title}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="mb-1 h-14 w-44 border-b-2 border-slate-700" />
                                    <p className="text-xs text-slate-400">Authorised signatory</p>
                                </div>
                            )}
                            <div className="text-center">
                                <div className="mb-1 h-14 w-44 border-b-2 border-slate-700" />
                                <p className="text-xs text-slate-400">Date verified</p>
                            </div>
                        </section>

                        {/* Footer */}
                        <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-400 print:mt-6">
                            <span>{institution.name} — Official Academic Transcript</span>
                            <span className="font-mono">{transcriptNumber}</span>
                        </footer>

                    </div>
                </div>
            </div>
        </>
    );
}

function SemesterSection({ sem, collapsed, onToggle }: { sem: TranscriptSemester; collapsed: boolean; onToggle: () => void }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 print:break-inside-avoid">
            <button type="button" onClick={onToggle} className="flex w-full items-center justify-between bg-slate-800 px-5 py-3 text-left print:cursor-default" aria-expanded={!collapsed}>
                <span className="text-sm font-semibold text-white">{sem.label}</span>
                <div className="flex items-center gap-5 text-xs">
                    <span className="text-slate-300">Cr. attempted: <span className="font-bold text-white">{sem.creditsAttempted}</span></span>
                    <span className="text-slate-300">Cr. earned: <span className="font-bold text-white">{sem.creditsEarned}</span></span>
                    <span className="text-slate-300">Quality pts: <span className="font-bold text-white">{sem.totalQualityPoints.toFixed(2)}</span></span>
                    <span className="rounded-full bg-white px-3 py-0.5 font-bold text-slate-900">SGPA {sem.sgpaFormatted}</span>
                    <svg className={`h-4 w-4 text-slate-400 transition-transform print:hidden ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </div>
            </button>
            <div className={collapsed ? "hidden print:block" : "block"}>
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead>
                        <tr className="bg-slate-50">
                            {["Code", "Course title", "Cr. hrs", "Grade", "Grade pt", "Quality pts"].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 last:text-right">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {sem.courses.map((c) => <CourseRow key={c.courseId} course={c} />)}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50">
                            <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Semester totals</td>
                            <td className="px-4 py-2 text-center text-xs font-semibold tabular-nums text-slate-800">{sem.creditsAttempted}</td>
                            <td className="px-4 py-2 text-center text-xs text-slate-400">—</td>
                            <td className="px-4 py-2 text-center text-xs text-slate-400">—</td>
                            <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-slate-800">{sem.totalQualityPoints.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function CourseRow({ course }: { course: TranscriptCourse }) {
    const pill = GRADE_PILL[course.grade] ?? "bg-slate-100 text-slate-700 border border-slate-200";
    return (
        <tr className="transition-colors hover:bg-slate-50/60 print:hover:bg-transparent">
            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium text-slate-600">{course.courseCode}</td>
            <td className="px-4 py-2.5 text-slate-800">
                {course.courseTitle}
                {!course.isScoring && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">non-scoring</span>}
            </td>
            <td className="px-4 py-2.5 text-center tabular-nums text-slate-700">{course.creditHours}</td>
            <td className="px-4 py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${pill}`}>{course.grade}</span></td>
            <td className="px-4 py-2.5 text-center tabular-nums text-slate-600">{course.isScoring ? course.gradePointFormatted : "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-700">{course.isScoring ? course.qualityPointsFormatted : "—"}</td>
        </tr>
    );
}

function InfoRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
    return (
        <div className="flex items-baseline gap-2">
            <span className="w-36 shrink-0 text-xs text-slate-500">{label}</span>
            <span className={`text-sm text-slate-900 ${bold ? "font-semibold" : ""} ${mono ? "font-mono" : ""}`}>{value}</span>
        </div>
    );
}

function SummaryCell({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-0.5 text-xl font-bold tabular-nums ${highlight ? "" : "text-slate-900"}`} style={highlight && color ? { color } : undefined}>{value}</p>
        </div>
    );
}

function SealIcon() {
    return <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>;
}

function TranscriptPrintStyles() {
    return (
        <style dangerouslySetInnerHTML={{
            __html: `
      @media print {
        body * { visibility: hidden; }
        #transcript-document, #transcript-document * { visibility: visible; }
        #transcript-document {
          position: absolute; top: 0; left: 0;
          width: 100%; max-width: 100%;
          border: none !important; overflow: visible !important;
        }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tbody { display: table-row-group; }
        .hidden { display: block !important; visibility: visible !important; }
        [data-print-hide], .print\\:hidden { display: none !important; }
        tr { page-break-inside: avoid; }
        @page { size: A4 portrait; margin: 12mm 14mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `}} />
    );
}