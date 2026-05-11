"use client";

/**
 * TranscriptPreview — browser preview matching the UEW official transcript.
 *
 * Print architecture:
 *   The document is structured as a full-width <table>:
 *     <thead> — header (logo → warning banner). Browsers repeat this on every page.
 *     <tfoot> — signature + footer. Browsers print this on the last page only.
 *     <tbody> — semester blocks + class designation.
 *
 *   This is the only reliable cross-browser way to repeat a header across
 *   printed pages. CSS `position: running()` has near-zero browser support.
 *   Puppeteer's headerTemplate is separate and covered in lib/pdf/template.ts.
 *
 * Screen view:
 *   Semesters are collapsible (click the blue header bar to toggle).
 *   All semesters are always shown in print regardless of collapsed state.
 */

import { useState } from "react";
// import { deleteTranscriptAction } from "@/actions/transcripts";
import type {
  TranscriptObject,
  TranscriptSemester,
  TranscriptCourse,
} from "@/lib/transcript/types";
import Image from "next/image";
import { text } from "stream/consumers";

export type TranscriptPreviewProps = {
  transcript: TranscriptObject;
  latestRecordId: string | null;
};

export function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
  const {
    student, institution, registrar, summary,
    semesters, transcriptNumber, generatedAt,
  } = transcript;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const printedOn = new Date(generatedAt).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Shared font/colour base ───────────────────────────────────────────────
  const base: React.CSSProperties = {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "9px",
    color: "#000",
  };

  return (
    <>
      <PrintStyles />

      {/*
        Outer wrapper — screen: constrained width, centred.
        Print: full page width, no border, no shadow.
      */}
      <div
        id="transcript-document"
        style={{
          ...base,
          maxWidth: "794px",
          margin: "0 auto",
          background: "white",
          border: "3px solid #1a237e",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Watermarks (screen only, hidden in print) ── */}
        <div className="print-hide" style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-20px", left: "-60px", width: "230%",
            lineHeight: "2.3", fontSize: "11px", whiteSpace: "nowrap",
            transform: "rotate(-30deg)", transformOrigin: "top left",
            color: "rgba(170,185,220,0.17)",
          }} aria-hidden>
            {"Education ".repeat(400)}
          </div>
        </div>

        {/*
          ── THE REPEATING TABLE ──────────────────────────────────────────────
          <thead> repeats on every printed page.
          <tfoot> appears at the bottom of the LAST page only.
          <tbody> is the main content.
        */}
        <table style={{ width: "100%", borderCollapse: "collapse", ...base }}>

          {/* ══ THEAD — repeats on every page ══════════════════════════════ */}
          <thead>
            <tr>
              <td style={{ padding: "10px 12px 0" }}>

                {/* Logo + institution name */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <div>
                    {institution.logoPath
                      ? <Image src={institution.logoPath} alt="crest" width={130} height={130} style={{ flexShrink: 0 }} />
                      : <LogoCrest />}
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "25px", fontWeight: 700, color: "#1a237e", letterSpacing: "0.5px", lineHeight: 1.2 }}>
                      {institution.name}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#1a237e", textAlign: "center", width: "80%", letterSpacing: "0.5px", lineHeight: 1.2 }}>
                      Academic Affairs Office
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1a237e", textAlign: "center", width: "80%", letterSpacing: "0.5px", lineHeight: 1.2 }}>
                      P.O.BOX 25, WINNEBA - GHANA
                    </div>
                    {institution.address && <div style={{ fontSize: "12px", color: "#000" }}>{institution.address}</div>}
                  </div>
                </div>

                {/* Official transcript banner */}
                <div style={{ background: "#2e5cb8", color: "white", textAlign: "center", fontSize: "12px", fontWeight: 700, padding: "5px", margin: "5px 0", letterSpacing: "1px" }}>
                  OFFICIAL TRANSCRIPT OF ACADEMIC RECORD
                </div>

                {/* Student info */}
                <div className="uppercase" style={{ display: "flex", flexDirection: "row", fontSize: "12px", marginBottom: "4px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", marginRight: "30px" }}>
                    <InfoLine label="Student Number" value={student.indexNumber} />
                    <InfoLine label="Date of Birth" value={student.dateOfBirth} />
                    <InfoLine label="Programme" value={student.programme.name} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", marginLeft: "-20px" }}>
                    <InfoLine label="Name" value={student.fullName} />
                    <InfoLine label="Entry Year" value={`${student.entryYear} - ${student.graduationYear}`} />
                  </div>
                  <div style={{ display: "flex", gap: "1px", marginRight: "20px", marginTop: "20px" }}>
                    <InfoLine label="Gender" value={student.gender} />
                  </div>
                  {/* <InfoLine label="Status" value={student.status} /> */}
                </div>

                {/* Warning banner */}
                <div style={{ background: "#2e5cb8", color: "white", textAlign: "center", fontSize: "10px", fontWeight: 700, padding: "3px", margin: "5px 0 8px", letterSpacing: "0.5px" }}>
                  A BLACK AND WHITE DOCUMENT IS NOT OFFICIAL
                </div>

              </td>
            </tr>
          </thead>

          {/* ══ TFOOT — last page only ══════════════════════════════════════ */}
          <tfoot>
            <tr>
              <td style={{ padding: "0 14px 10px" }}>

                {/* Class designation */}
                <div style={{ marginTop: "1px", fontSize: "10px", color: "#000" }}>
                  Class Designation: <strong>{summary.classification}</strong>
                </div>

                {/* Signature — right aligned */}
                <div style={{ marginTop: "18px", textAlign: "right" }}>
                  <div style={{ display: "inline-block", textAlign: "center" }}>
                    {registrar?.signaturePath && (
                      <div style={{ height: "40px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "3px" }}>
                        <img src={registrar.signaturePath} style={{ maxHeight: "38px", maxWidth: "130px", objectFit: "contain" }} alt="Signature" />
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #000", width: "160px", margin: "0 auto 3px" }} />
                    <div style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.6 }}>DEPUTY REGISTRAR</div>
                    <div style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.6 }}>(Academic Affairs)</div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ borderTop: "0.5px solid #999", marginTop: "8px", paddingTop: "3px", display: "flex", justifyContent: "space-between", fontSize: "7.5px", color: "#000" }}>
                  <span>Grading Scheme: IC=(Incomplete), X=(Withheld), ADT=0-0(Audit)</span>
                  <span>{transcriptNumber} &nbsp; Printed: {printedOn}</span>
                </div>

              </td>
            </tr>
          </tfoot>

          {/* ══ TBODY — semester blocks ═════════════════════════════════════ */}
          <tbody>
            <tr>
              <td style={{ padding: "0 12px" }}>

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

              </td>
            </tr>
          </tbody>

        </table>
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
    <div style={{ marginBottom: "1px" }}>
      {/* Semester header — click to collapse on screen */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", background: "#2e5cb8", color: "white",
          padding: "3px 6px", fontSize: "10px", fontWeight: 700,
          textAlign: "left", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
        aria-expanded={!collapsed}
      >
        <span>{sem.label}</span>
        <span style={{ fontSize: "9px", opacity: 0.7 }} className="print-hide">
          {collapsed ? "▶" : "▼"}
        </span>
      </button>

      {/* Grades table — always shown in print via CSS */}
      <div className={collapsed ? "sem-collapsed" : ""}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "center", width: "72px" }}>Code</th>
              <th style={{ ...thBase, textAlign: "left" }}>Course Title</th>
              <th style={{ ...thBase, width: "44px", textAlign: "center" }}>Credits</th>
              <th style={{ ...thBase, width: "32px", textAlign: "center" }}>Grade</th>
              <th style={{ ...thBase, width: "50px", textAlign: "center" }}>Grade Point</th>
            </tr>
          </thead>
          <tbody>
            {sem.courses.map((c) => <CourseRow key={c.courseId} course={c} />)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ ...tdTotals, textAlign: "left", fontSize: "10px", fontWeight: 500 }}>
                TCR: {tcr} &nbsp; TGP: {tgp} &nbsp; CCR: {ccr} &nbsp; CGV: {cgv}
              </td>
              <td colSpan={3} style={{ ...tdTotals, textAlign: "right", width: "126px", fontSize: "10px" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", gap: "1px", alignItems: "flex-start" }}>
                  <GpaRow label="Semester GPA" value={sem.sgpaFormatted} />
                  <GpaRow label="Cumulative GPA" value={cgpaFormatted} />
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
      <td className="uppercase" style={{ ...tdBase, textAlign: "left" }}>
        {course.courseTitle}
        {!course.isScoring && <span style={{ marginLeft: "4px", fontSize: "7px", color: "#555" }}>(non-scoring)</span>}
      </td>
      <td style={{ ...tdBase, textAlign: "center" }}>{course.creditHours}.00</td>
      <td style={{ ...tdBase, textAlign: "center" }}>{course.grade}</td>
      <td style={{ ...tdBase, textAlign: "center" }}>{course.isScoring ? course.qualityPointsFormatted : "0.00"}</td>
    </tr>
  );
}

function GpaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontSize: "8.5px", fontWeight: 700, color: "#000", lineHeight: 1.5 }}>
      <span style={{ width: "70px" }}>{label}</span>
      <span style={{ width: "8px", textAlign: "center" }}>:</span>
      <span style={{ width: "20px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── Shared style objects ─────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  background: "#d4d4d4", fontSize: "10px", fontWeight: 700,
  padding: "2px 4px", textAlign: "right", border: "0.5px solid #999", color: "#000",
};
const tdBase: React.CSSProperties = {
  fontSize: "10px", padding: "2px 4px", border: "0.5px solid #ccc",
  textAlign: "right", color: "#000",
};
const tdTotals: React.CSSProperties = {
  background: "#e8ecf5", border: "0.5px solid #bbc4d8",
  padding: "3px 6px", verticalAlign: "middle",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", fontSize: "11px", lineHeight: "1.7" }}>
      <span style={{ fontWeight: 700, color: "#000", minWidth: "60px", flexShrink: 0 }}>{label}:</span>
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

// ─── Print styles ─────────────────────────────────────────────────────────────

function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
      @media print {

        @page {
          size: A4 portrait;
          margin: 1mm 1mm;
        }

        /* Hide everything except the transcript */
        body * { visibility: hidden; }
        #transcript-document,
        #transcript-document * { visibility: visible; }

        /* Anchor transcript to top of page */
        #transcript-document {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          max-width: 100%;
          border: none !important;
          overflow: visible !important;
        }

        /* thead repeats on every page — this is the key rule */
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tbody { display: table-row-group; }

        /* Always show semester grades in print even if collapsed on screen */
        .sem-collapsed { display: block !important; visibility: visible !important; }

        /* Hide screen-only elements */
        .print-hide { display: none !important; }

        /* Keep rows together */
        tr { page-break-inside: avoid; }

        /* Force colour printing (blue banners etc) */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}} />
  );
}
