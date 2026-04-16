/**
 * Transcript HTML template — UEW style.
 *
 * Produces a self-contained HTML string that Puppeteer renders to PDF.
 * Design matches the University of Education Winneba official transcript:
 *   - Blue border, blue banners, Education watermark text
 *   - Large crest watermark centred on the page
 *   - Semester headers in banner blue (#2e5cb8)
 *   - Totals row: TCR · TGP · CCR · CGV left | SGPA / CGPA stacked right
 *   - Header (logo → warning banner) repeats on every printed page via @page
 *   - Signature block appears only on the last page
 */

import type { TranscriptObject } from "@/lib/transcript";

export function renderTranscriptHtml(data: TranscriptObject): string {
  const {
    student,
    institution,
    registrar,
    summary,
    semesters,
    transcriptNumber,
    generatedAt,
  } = data;

  const printedOn = new Date(generatedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const semesterBlocks = semesters
    .map((sem) => {
      const courseRows = sem.courses
        .map(
          (g) => `
      <tr>
        <td class="code">${esc(g.courseCode)}</td>
        <td class="title">${esc(g.courseTitle)}${!g.isScoring ? ' <span class="ns">(non-scoring)</span>' : ""}</td>
        <td class="num">${g.creditHours}.00</td>
        <td class="num">${esc(g.grade)}</td>
        <td class="num">${g.isScoring ? g.qualityPointsFormatted : "—"}</td>
      </tr>`,
        )
        .join("");

      // Cumulative credits earned up to this semester (creditsEarned = scoring, non-F)
      const tcr = sem.creditsAttempted.toFixed(2);
      const tgp = sem.totalQualityPoints.toFixed(2);
      const ccr = sem.creditsEarned.toFixed(2);
      const cgv = sem.totalQualityPoints.toFixed(2);

      return `
    <div class="sem-block">
      <div class="sem-header">${esc(sem.label)}</div>
      <table class="grade-table">
        <thead>
          <tr>
            <th class="th-code">Code</th>
            <th class="th-title">Course Title</th>
            <th class="th-num">Credits</th>
            <th class="th-num">Grade</th>
            <th class="th-num">Grade Point</th>
          </tr>
        </thead>
        <tbody>${courseRows}</tbody>
        <tfoot>
          <tr class="totals">
            <td colspan="2" class="totals-left">TCR: ${tcr} &nbsp; TGP: ${tgp} &nbsp; CCR: ${ccr} &nbsp; CGV: ${cgv}</td>
            <td colspan="3" class="totals-right">
              <div class="gpa-stack">
                <div class="gpa-row"><span class="gpa-label">SGPA</span><span class="gpa-colon">:</span><span class="gpa-value">${sem.sgpaFormatted}</span></div>
                <div class="gpa-row"><span class="gpa-label">CGPA</span><span class="gpa-colon">:</span><span class="gpa-value">${summary.cgpaFormatted}</span></div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>`;
    })
    .join("");

  const crestSvg = `<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="none" stroke="#1a237e" stroke-width="1.2"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#1a237e" stroke-width="0.7"/>
    <circle cx="50" cy="50" r="34" fill="none" stroke="#1a237e" stroke-width="0.5"/>
    <circle cx="50" cy="50" r="26" fill="none" stroke="#1a237e" stroke-width="0.4"/>
    <text x="50" y="44" text-anchor="middle" font-size="22" font-weight="700" fill="#1a237e" font-family="Arial">88</text>
    <text x="50" y="57" text-anchor="middle" font-size="6" fill="#1a237e" font-family="Arial">EDUCATION FOR SERVICE</text>
    <text x="50" y="67" text-anchor="middle" font-size="4.5" fill="#1a237e" font-family="Arial">UNIVERSITY OF EDUCATION</text>
  </svg>`;

  const logoSvg = `<svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#1a237e"/>
    <circle cx="50" cy="50" r="44" fill="none" stroke="white" stroke-width="0.8"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="white" stroke-width="0.5"/>
    <circle cx="50" cy="50" r="27" fill="white" fill-opacity="0.12"/>
    <text x="50" y="44" text-anchor="middle" font-size="21" font-weight="700" fill="white" font-family="Arial">88</text>
    <text x="50" y="57" text-anchor="middle" font-size="5.5" fill="white" font-family="Arial">EDUCATION FOR SERVICE</text>
    <text x="50" y="67" text-anchor="middle" font-size="4.5" fill="white" font-family="Arial">UNIVERSITY OF EDUCATION</text>
    <path d="M14 73 Q50 81 86 73" fill="none" stroke="white" stroke-width="0.6"/>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Transcript – ${esc(student.fullName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 12mm 14mm 14mm 14mm;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #000;
    background: white;
  }

  /* ── Outer border — inset so it never bleeds off the printable area ── */
  .page-wrap {
    width: 100%;
    min-height: calc(297mm - 26mm);
    outline: 2.5pt solid #1a237e;
    outline-offset: -1pt;
    position: relative;
    overflow: visible;
    padding: 8mm 10mm;
  }

  /* ── Watermark text (diagonal repeat) ── */
  .wm-text {
    position: absolute;
    top: -20mm;
    left: -30mm;
    width: 280mm;
    height: 340mm;
    font-size: 9pt;
    color: rgba(170,185,220,0.16);
    line-height: 2.2;
    white-space: nowrap;
    transform: rotate(-30deg);
    transform-origin: top left;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Large central crest watermark ── */
  .wm-crest-main {
    position: absolute;
    width: 130mm;
    height: 130mm;
    top: 55mm;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.07;
    pointer-events: none;
    z-index: 0;
  }
  .wm-crest-bl {
    position: absolute;
    width: 42mm;
    height: 42mm;
    bottom: 22mm;
    left: 12mm;
    opacity: 0.06;
    pointer-events: none;
    z-index: 0;
  }
  .wm-crest-br {
    position: absolute;
    width: 42mm;
    height: 42mm;
    bottom: 22mm;
    right: 12mm;
    opacity: 0.06;
    pointer-events: none;
    z-index: 0;
  }

  /* ── All content above watermarks ── */
  .content { position: relative; z-index: 1; }

  /* ── Header ── */
  .doc-header {
    display: flex;
    align-items: center;
    gap: 8pt;
    margin-bottom: 4pt;
  }
  .header-text { flex: 1; text-align: center; }
  .uni-name { font-size: 15pt; font-weight: 700; color: #1a237e; line-height: 1.2; }
  .uni-sub  { font-size: 10pt; font-weight: 700; color: #1a237e; }
  .uni-addr { font-size: 8pt; color: #000; }

  .official-banner {
    background: #2e5cb8;
    color: white;
    text-align: center;
    font-size: 11pt;
    font-weight: 700;
    padding: 4pt;
    margin: 4pt 0;
    letter-spacing: 0.06em;
  }

  .student-info {
    font-size: 8pt;
    margin-bottom: 3pt;
  }
  .info-line { display: flex; gap: 4pt; line-height: 1.7; }
  .info-lbl  { font-weight: 700; min-width: 100pt; flex-shrink: 0; }
  .prog-line { font-size: 8pt; margin-bottom: 3pt; }

  .warning-banner {
    background: #2e5cb8;
    color: white;
    text-align: center;
    font-size: 9pt;
    font-weight: 700;
    padding: 2.5pt;
    margin-bottom: 5pt;
    letter-spacing: 0.04em;
  }

  /* ── Semester blocks ── */
  .sem-block { margin-bottom: 6pt; page-break-inside: avoid; }
  .sem-header {
    background: #2e5cb8;
    color: white;
    padding: 2.5pt 5pt;
    font-size: 9pt;
    font-weight: 700;
  }

  .grade-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .grade-table th {
    background: #d4d4d4;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2pt 3pt;
    text-align: right;
    border: 0.4pt solid #999;
    color: #000;
  }
  .th-code  { width: 56pt; text-align: left; }
  .th-title { text-align: left; }
  .th-num   { width: 40pt; }

  .grade-table td {
    font-size: 7.5pt;
    padding: 2pt 3pt;
    border: 0.4pt solid #ccc;
    text-align: right;
    color: #000;
  }
  .code { text-align: left; font-weight: 700; }
  .title { text-align: left; }
  .num  { text-align: right; }
  .ns   { font-size: 6.5pt; color: #555; }

  /* Totals row */
  .totals td { background: #e8ecf5; border: 0.4pt solid #bbc4d8; padding: 2.5pt 5pt; }
  .totals-left  { text-align: left; font-size: 7.5pt; font-weight: 500; vertical-align: middle; }
  .totals-right { text-align: right; width: 90pt; vertical-align: middle; }

  .gpa-stack { display: inline-block; text-align: left; }
  .gpa-row   { display: flex; align-items: baseline; font-size: 8pt; font-weight: 700; color: #000; line-height: 1.5; }
  .gpa-label { width: 26pt; }
  .gpa-colon { width: 8pt; text-align: center; }
  .gpa-value { width: 26pt; text-align: right; font-variant-numeric: tabular-nums; }

  /* ── Class designation ── */
  .class-designation { font-size: 9pt; margin-top: 10pt; }

  /* ── Signature (last page only) ── */
  .sig-section { margin-top: 16pt; text-align: right; }
  .sig-block   { display: inline-block; text-align: center; }
  .sig-line    { border-top: 0.75pt solid #000; width: 130pt; margin: 0 auto 3pt; }
  .sig-name    { font-size: 8pt; font-weight: 700; line-height: 1.6; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 8pt;
    padding-top: 3pt;
    border-top: 0.4pt solid #999;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #000;
  }

  /* ── Print ── */
  @media print {
    body { margin: 0; }
    .page-wrap { min-height: 0; outline: 2pt solid #1a237e; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page-wrap">

  <!-- Watermark text -->
  <div class="wm-text" aria-hidden="true">${"Education ".repeat(400)}</div>

  <!-- Central crest -->
  <div class="wm-crest-main" aria-hidden="true">${crestSvg}</div>
  <div class="wm-crest-bl"   aria-hidden="true">${crestSvg}</div>
  <div class="wm-crest-br"   aria-hidden="true">${crestSvg}</div>

  <div class="content">

    <!-- Header — repeats on every page when printing -->
    <header>
      <div class="doc-header">
        ${
          institution.logoPath
            ? `<img src="${esc(institution.logoPath)}" width="72" height="72" alt="${esc(institution.name)} crest">`
            : logoSvg
        }
        <div class="header-text">
          <div class="uni-name">${esc(institution.name)}</div>
          <div class="uni-sub">Academic Affairs Office</div>
          ${institution.address ? `<div class="uni-addr">${esc(institution.address)}</div>` : ""}
        </div>
      </div>

      <div class="official-banner">OFFICIAL TRANSCRIPT OF ACADEMIC RECORD</div>

      <div class="student-info">
        <div class="info-line"><span class="info-lbl">Student Number:</span><span>${esc(student.indexNumber)}</span></div>
        <div class="info-line"><span class="info-lbl">Name:</span><span>${esc(student.fullName)}</span></div>
        <div class="info-line"><span class="info-lbl">Date of Birth:</span><span></span></div>
        <div class="info-line"><span class="info-lbl">Status:</span><span>${esc(student.status)}</span></div>
        <div class="info-line"><span class="info-lbl">Entry Year:</span><span>${student.entryYear}${student.graduationYear ? ` – ${student.graduationYear}` : ""}</span></div>
        <div class="info-line"><span class="info-lbl">Programme:</span><span>${esc(student.programme.name)} (${esc(student.programme.code)})</span></div>
      </div>

      <div class="warning-banner">A BLACK AND WHITE DOCUMENT IS NOT OFFICIAL</div>
    </header>

    <!-- Semester results -->
    <section>
      ${semesterBlocks || "<p style='font-size:8pt;color:#555;'>No grade records found for this student.</p>"}
    </section>

    <!-- Class designation -->
    <div class="class-designation">
      Class Designation: <strong>${esc(summary.classification)}</strong>
    </div>

    <!-- Signature — last page only -->
    <div class="sig-section">
      <div class="sig-block">
        ${
          registrar?.signaturePath
            ? `<div style="height:36pt;display:flex;align-items:flex-end;justify-content:center;margin-bottom:3pt;">
               <img src="${esc(registrar.signaturePath)}" style="max-height:34pt;max-width:120pt;object-fit:contain;" alt="Signature">
             </div>`
            : `<div style="height:36pt;"></div>`
        }
        <div class="sig-line"></div>
        <div class="sig-name">DEPUTY REGISTRAR</div>
        <div class="sig-name">(Academic Affairs)</div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="doc-footer">
      <span>Grading Scheme: IC=(Incomplete), X=(Withheld), ADT=0-0(Audit)</span>
      <span>${esc(transcriptNumber)} &nbsp; Printed: ${printedOn}</span>
    </footer>

  </div><!-- /content -->
</div><!-- /page-wrap -->
</body>
</html>`;
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
