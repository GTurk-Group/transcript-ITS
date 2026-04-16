"use client";

/**
 * TranscriptPreview — browser preview of the official transcript.
 *
 * Design matches the UEW official transcript:
 *   - Blue (#1a237e) border, blue (#2e5cb8) banners
 *   - Education watermark text + large crest watermark
 *   - Semester headers in banner blue
 *   - Totals: TCR · TGP · CCR · CGV left  |  SGPA / CGPA stacked right
 *   - Header repeats on every print page via CSS
 *   - Signature only on the last page
 */

import { useState, useEffect, useRef } from "react";
import type {
  TranscriptObject,
  TranscriptSemester,
  TranscriptCourse,
  GradeClassification,
} from "@/lib/transcript/types";

export type TranscriptPreviewProps = {
  transcript: TranscriptObject;
  latestRecordId: string | null;
};

export function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
  const { student, institution, registrar, summary, semesters, transcriptNumber, generatedAt } = transcript;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const printedOn = new Date(generatedAt).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      <PrintStyles />

      <div id="transcript-document" className="mx-auto w-full max-w-[794px]">
        {/* Paper */}
        <div style={{ background: "white", border: "3px solid #1a237e", position: "relative", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9px", color: "#000" }} className="print-paper">

          {/* Watermark text */}
          <div style={{ position: "absolute", top: "-20px", left: "-60px", width: "230%", lineHeight: "2.3", fontSize: "11px", whiteSpace: "nowrap", transform: "rotate(-30deg)", transformOrigin: "top left", color: "rgba(170,185,220,0.17)", pointerEvents: "none", zIndex: 0 }} aria-hidden>
            {"Education ".repeat(400)}
          </div>

          {/* Large centre crest */}
          <CrestWatermark style={{ width: "420px", height: "420px", top: "88px", left: "50%", transform: "translateX(-50%)", opacity: 0.07 }} />
          <CrestWatermark style={{ width: "110px", height: "110px", bottom: "80px", left: "40px", opacity: 0.06 }} />
          <CrestWatermark style={{ width: "110px", height: "110px", bottom: "80px", right: "40px", opacity: 0.06 }} />

          <div style={{ position: "relative", zIndex: 1, padding: "10px 12px" }}>

            {/* ── Header ── */}
            <div id="transcript-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                {institution.logoPath
                  ? <img src={institution.logoPath} alt={`${institution.name} crest`} width={80} height={80} style={{ flexShrink: 0 }} />
                  : <LogoCrest />}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "#1a237e", letterSpacing: "0.5px", lineHeight: 1.2 }}>{institution.name}</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#1a237e" }}>Academic Affairs Office</div>
                  {institution.address && <div style={{ fontSize: "9px", color: "#000" }}>{institution.address}</div>}
                </div>
              </div>

              <div style={{ background: "#2e5cb8", color: "white", textAlign: "center", fontSize: "12px", fontWeight: 700, padding: "5px", margin: "5px 0", letterSpacing: "1px" }}>
                OFFICIAL TRANSCRIPT OF ACADEMIC RECORD
              </div>

              <div style={{ fontSize: "9px", marginBottom: "4px" }}>
                <InfoLine label="Student Number" value={student.indexNumber} />
                <InfoLine label="Name" value={student.fullName} />
                <InfoLine label="Date of Birth" value="" />
                <InfoLine label="Status" value={student.status} />
                <InfoLine label="Entry Year" value={`${student.entryYear}${student.graduationYear ? ` – ${student.graduationYear}` : ""}`} />
                <InfoLine label="Programme" value={`${student.programme.name} (${student.programme.code})`} />
              </div>

              <div style={{ background: "#2e5cb8", color: "white", textAlign: "center", fontSize: "10px", fontWeight: 700, padding: "3px", margin: "5px 0", letterSpacing: "0.5px" }}>
                A BLACK AND WHITE DOCUMENT IS NOT OFFICIAL
              </div>
            </div>

            {/* ── Semesters ── */}
            <section>
              {semesters.length === 0
                ? <p style={{ fontSize: "9px", color: "#555", padding: "8px 0" }}>No grade records found for this student.</p>
                : semesters.map((sem) => (
                  <SemesterBlock
                    key={sem.semesterId}
                    sem={sem}
                    cgpaFormatted={summary.cgpaFormatted}
                    collapsed={collapsed.has(sem.semesterId)}
                    onToggle={() => toggle(sem.semesterId)}
                  />
                ))}
            </section>

            {/* ── Class designation ── */}
            <div style={{ marginTop: "14px", fontSize: "10px", color: "#000" }}>
              Class Designation: <strong>{summary.classification}</strong>
            </div>

            {/* ── Signature ── */}
            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }} className="print:block">
              <div style={{ textAlign: "center" }}>
                {registrar?.signaturePath && (
                  <div style={{ height: "40px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "3px" }}>
                    <img src={registrar.signaturePath} style={{ maxHeight: "38px", maxWidth: "130px", objectFit: "contain" }} alt="Registrar signature" />
                  </div>
                )}
                <div style={{ borderTop: "1px solid #000", width: "160px", margin: "0 auto 3px" }} />
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#000", lineHeight: 1.6 }}>DEPUTY REGISTRAR</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#000", lineHeight: 1.6 }}>(Academic Affairs)</div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ borderTop: "0.5px solid #999", marginTop: "8px", paddingTop: "3px", display: "flex", justifyContent: "space-between", fontSize: "7.5px", color: "#000" }}>
              <span>Grading Scheme: IC=(Incomplete), X=(Withheld), ADT=0-0(Audit)</span>
              <span>{transcriptNumber} &nbsp; Printed: {printedOn}</span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ─── Semester block ────────────────────────────────────────────────────────────

function SemesterBlock({ sem, cgpaFormatted, collapsed, onToggle }: {
  sem: TranscriptSemester;
  cgpaFormatted: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const tcr = sem.creditsAttempted.toFixed(2);
  const tgp = sem.totalQualityPoints.toFixed(2);
  const ccr = sem.creditsEarned.toFixed(2);
  const cgv = sem.totalQualityPoints.toFixed(2);

  return (
    <div style={{ marginBottom: "8px" }}>
      <button
        type="button" onClick={onToggle}
        style={{ width: "100%", background: "#2e5cb8", color: "white", padding: "3px 6px", fontSize: "10px", fontWeight: 700, textAlign: "left", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        className="print:cursor-default"
        aria-expanded={!collapsed}
      >
        <span>{sem.label}</span>
        <span style={{ fontSize: "9px", opacity: 0.7 }} className="print:hidden">{collapsed ? "▶" : "▼"}</span>
      </button>

      <div className={collapsed ? "hidden print:block" : "block"}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left", width: "70px" }}>Code</th>
              <th style={{ ...thBase, textAlign: "left" }}>Course Title</th>
              <th style={{ ...thBase, width: "44px" }}>Credits</th>
              <th style={{ ...thBase, width: "32px" }}>Grade</th>
              <th style={{ ...thBase, width: "50px" }}>Grade Point</th>
            </tr>
          </thead>
          <tbody>
            {sem.courses.map((c) => <CourseRow key={c.courseId} course={c} />)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ ...tdTotals, textAlign: "left", fontSize: "8px", fontWeight: 500 }}>
                TCR: {tcr} &nbsp; TGP: {tgp} &nbsp; CCR: {ccr} &nbsp; CGV: {cgv}
              </td>
              <td colSpan={3} style={{ ...tdTotals, textAlign: "right", width: "126px" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", gap: "1px", alignItems: "flex-start" }}>
                  <GpaRow label="SGPA" value={sem.sgpaFormatted} />
                  <GpaRow label="CGPA" value={cgpaFormatted} />
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CourseRow({ course }: { course: TranscriptCourse }) {
  return (
    <tr style={{ borderBottom: "0.5px solid #ccc" }}>
      <td style={{ ...tdBase, textAlign: "left", fontWeight: 700 }}>{course.courseCode}</td>
      <td style={{ ...tdBase, textAlign: "left" }}>
        {course.courseTitle}
        {!course.isScoring && <span style={{ marginLeft: "4px", fontSize: "7px", color: "#555" }}>(non-scoring)</span>}
      </td>
      <td style={tdBase}>{course.creditHours}.00</td>
      <td style={tdBase}>{course.grade}</td>
      <td style={tdBase}>{course.isScoring ? course.qualityPointsFormatted : "—"}</td>
    </tr>
  );
}

function GpaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontSize: "8.5px", fontWeight: 700, color: "#000", lineHeight: 1.5 }}>
      <span style={{ width: "26px" }}>{label}</span>
      <span style={{ width: "8px", textAlign: "center" }}>:</span>
      <span style={{ width: "26px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── Shared style objects ─────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  background: "#d4d4d4", fontSize: "8px", fontWeight: 700,
  padding: "2px 4px", textAlign: "right", border: "0.5px solid #999", color: "#000",
};
const tdBase: React.CSSProperties = {
  fontSize: "8px", padding: "2px 4px", border: "0.5px solid #ccc", textAlign: "right", color: "#000",
};
const tdTotals: React.CSSProperties = {
  background: "#e8ecf5", border: "0.5px solid #bbc4d8", padding: "3px 6px", verticalAlign: "middle",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", fontSize: "9px", lineHeight: "1.7" }}>
      <span style={{ fontWeight: 700, color: "#000", minWidth: "100px", flexShrink: 0 }}>{label}:</span>
      <span style={{ color: "#000" }}>{value}</span>
    </div>
  );
}

function LogoCrest() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r="48" fill="#1a237e" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="27" fill="white" fillOpacity="0.12" />
      <text x="50" y="44" textAnchor="middle" fontSize="21" fontWeight="700" fill="white" fontFamily="Arial">88</text>
      <text x="50" y="57" textAnchor="middle" fontSize="5.5" fill="white" fontFamily="Arial">EDUCATION FOR SERVICE</text>
      <text x="50" y="67" textAnchor="middle" fontSize="4.5" fill="white" fontFamily="Arial">UNIVERSITY OF EDUCATION</text>
    </svg>
  );
}

function CrestWatermark({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={{ position: "absolute", pointerEvents: "none", zIndex: 0, ...style }}>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#1a237e" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#1a237e" strokeWidth="0.7" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#1a237e" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#1a237e" strokeWidth="0.4" />
      <text x="50" y="44" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a237e" fontFamily="Arial">88</text>
      <text x="50" y="57" textAnchor="middle" fontSize="6" fill="#1a237e" fontFamily="Arial">EDUCATION FOR SERVICE</text>
      <text x="50" y="67" textAnchor="middle" fontSize="4.5" fill="#1a237e" fontFamily="Arial">UNIVERSITY OF EDUCATION</text>
    </svg>
  );
}

// ─── Print styles ─────────────────────────────────────────────────────────────

function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
      @media print {
        /* ── Step 1: make everything invisible ── */
        body * {
          visibility: hidden !important;
        }

        /* ── Step 2: make only the transcript and its children visible ── */
        #transcript-document,
        #transcript-document * {
          visibility: visible !important;
        }

        /* ── Step 3: position transcript at the top-left of the page ── */
        #transcript-document {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ── Step 4: remove the decorative border — @page margin is the boundary ── */
        .print-paper {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          width: 100% !important;
        }

        /* ── Page geometry ── */
        @page {
          size: A4 portrait;
          margin: 5mm 5mm;
        }

        /* ── Keep collapsed semesters visible in print ── */
        .hidden { visibility: visible !important; display: block !important; }
        .print\\:hidden { visibility: hidden !important; }

        /* ── Avoid splitting rows across pages ── */
        tr { page-break-inside: avoid; }

        /* ── Force colour backgrounds to print ── */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}} />
  );
}