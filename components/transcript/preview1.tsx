"use client";

/**
 * TranscriptPreview — UEW official transcript layout.
 *
 * Architecture:
 *   <thead>  — Institution header, student info, warning bar (repeats on each page)
 *   <tbody>  — Semester blocks (courses, totals, class designation) + signature block (last page only)
 *
 * The signature block is placed inside <tbody> after all semesters so it appears only on the final page.
 * The border/frame is applied to the container via box-shadow and min-height: 100vh in print styles.
 */

import { useMemo, useState } from "react";
import type {
    TranscriptObject,
    TranscriptCourse,
} from "@/lib/transcript/types";
import {
    formatTranscriptStudentName,
    formatTranscriptDateOfBirth,
    formatStudyPeriod,
    formatTranscriptPrintedOn,
    withRunningTotals,
    UEW_CONTACT,
    TRANSCRIPT_FOOTER_LEGEND,
    type SemesterRunningTotals,
} from "./display";
import Image from "next/image";
import universityLogo from "@/public/uew-logo.png";

export type TranscriptPreviewProps = {
    transcript: Omit<TranscriptObject, "generatedByAdminId"> & {
        generatedByAdminId?: string;
    };
    latestRecordId: string | null;
};

export function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
    const {
        student,
        institution,
        registrar,
        summary,
        semesters,
        transcriptNumber,
        generatedAt,
    } = transcript;

    const semestersWithTotals = useMemo(
        () => withRunningTotals(semesters),
        [semesters],
    );

    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const toggle = (id: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const printedOn = formatTranscriptPrintedOn(generatedAt);
    const studentName = formatTranscriptStudentName(
        student.lastName,
        student.firstName,
        student.middleName,
    );

    const base: React.CSSProperties = {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "9px",
        color: "#000",
    };

    return (
        <>
            <PrintStyles />

            <div id="transcript-print-root">
                <div
                    id="transcript-document"
                    style={{
                        ...base,
                        maxWidth: "794px",
                        margin: "0 auto",
                        background: "white",
                        position: "relative",
                        overflow: "hidden",
                        paddingBottom: "50px",
                        // The frame is applied via box-shadow in print styles (see PrintStyles)
                    }}
                >
                    {/* Watermark seal */}
                    <div
                        className="print-hide"
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        aria-hidden
                    >
                        <LogoCrest size={320} opacity={0.06} />
                    </div>

                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            ...base,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        {/* ─── Header: repeats on every printed page ─── */}
                        <thead>
                            <tr>
                                <td style={{ padding: "8px 12px 0" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: "12px",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        {/* Logo */}
                                        <div style={{ flexShrink: 0 }}>
                                            <Image
                                                src={universityLogo}
                                                alt="University crest"
                                                width={120}
                                                height={120}
                                                priority
                                            />
                                        </div>

                                        {/* Institution details */}
                                        <div style={{ flex: 1, textAlign: "center" }}>
                                            <div
                                                style={{
                                                    fontSize: "24px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.4px",
                                                    lineHeight: 1.2,
                                                    textTransform: "uppercase",
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                {institution.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: 700,
                                                    lineHeight: 1.3,
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                Academic Affairs Office
                                            </div>
                                            <div style={{ fontSize: "11px", lineHeight: 1.4 }}>
                                                {institution.address ?? UEW_CONTACT.poBox}
                                            </div>
                                            <div style={{ fontSize: "11px", lineHeight: 1.4 }}>
                                                Email: {UEW_CONTACT.email} &nbsp;|&nbsp; Website:{" "}
                                                {UEW_CONTACT.website}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title bar */}
                                    <div
                                        style={{
                                            background: "#2e5cb8",
                                            color: "white",
                                            textAlign: "center",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            padding: "3px",
                                            marginBottom: "8px",
                                            letterSpacing: "0.5px",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        OFFICIAL TRANSCRIPT OF ACADEMIC RECORD
                                    </div>

                                    {/* Student information grid */}
                                    <div
                                        style={{
                                            display: "flex",
                                            // gap: "2px 24px",
                                            fontSize: "11px",
                                            marginBottom: "6px",
                                            alignItems: "start",
                                        }}
                                    >
                                        <div>
                                            <InfoLine
                                                label="Student Number"
                                                value={student.indexNumber}
                                            />
                                            <InfoLine
                                                label="Date Of Birth"
                                                value={formatTranscriptDateOfBirth(student.dateOfBirth)}
                                            />
                                            <InfoLine
                                                label="Programme"
                                                value={student.programme.name}
                                            />
                                        </div>
                                        <div className="-ml-24">
                                            <InfoLine label="Name" value={studentName} />
                                            <InfoLine
                                                label="Period"
                                                value={formatStudyPeriod(
                                                    String(student.entryYear),
                                                    String(student.graduationYear),
                                                )}
                                            />
                                            <div className="flex -mt-4 ml-64">
                                                {student.gender && (
                                                    <InfoLine label="Gender" value={student.gender} />
                                                )}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Warning bar */}
                                    <div
                                        style={{
                                            background: "#2e5cb8",
                                            color: "white",
                                            textAlign: "center",
                                            fontSize: "9px",
                                            fontWeight: 700,
                                            padding: "2px",
                                            margin: "4px 0 6px",
                                        }}
                                    >
                                        A BLACK AND WHITE DOCUMENT IS NOT OFFICIAL
                                    </div>
                                </td>
                            </tr>
                        </thead>

                        {/* ─── Body: semester blocks + signature (last page only) ─── */}
                        <tbody>
                            <tr>
                                <td style={{ padding: "0 12px" }}>
                                    {semestersWithTotals.length === 0 ? (
                                        <p
                                            style={{
                                                fontSize: "11px",
                                                color: "#555",
                                                padding: "12px 0",
                                            }}
                                        >
                                            No grade records found for this student.
                                        </p>
                                    ) : (
                                        <>
                                            {/* Render all semesters */}
                                            {semestersWithTotals.map((sem, index) => (
                                                <SemesterBlock
                                                    key={sem.semesterId}
                                                    sem={sem}
                                                    collapsed={collapsed.has(sem.semesterId)}
                                                    onToggle={() => toggle(sem.semesterId)}
                                                    showClassDesignation={
                                                        index === semestersWithTotals.length - 1
                                                    }
                                                    classification={summary.classification}
                                                />
                                            ))}

                                            {/* ─── Signature block – only on the last page ─── */}
                                            <div className="w-full" style={{ marginTop: "50px" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                        paddingRight: "20px",
                                                    }}
                                                >
                                                    <div style={{ textAlign: "center" }}>
                                                        {registrar?.signaturePath && (
                                                            <div
                                                                style={{
                                                                    height: "40px",
                                                                    display: "flex",
                                                                    alignItems: "flex-end",
                                                                    justifyContent: "center",
                                                                    marginBottom: "4px",
                                                                }}
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={registrar.signaturePath}
                                                                    alt="Signature"
                                                                    style={{
                                                                        maxHeight: "36px",
                                                                        maxWidth: "120px",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                borderTop: "1.5px solid #000",
                                                                width: "180px",
                                                                margin: "0 auto 2px",
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                fontSize: "11px",
                                                                fontWeight: 700,
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            DEPUTY REGISTRAR
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: "11px",
                                                                fontWeight: 700,
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            DIVISION OF ACADEMIC AFFAIRS
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer line with legend and print info */}
                                                <div
                                                    style={{
                                                        position: "fixed",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        background: "white",
                                                        padding: "6px 12px 4px",
                                                        borderTop: "0.5px solid #999",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "flex-end",
                                                        fontSize: "7.5px",
                                                        color: "#000",
                                                        gap: "20px",
                                                        zIndex: 1000,
                                                    }}
                                                >
                                                    <span>{TRANSCRIPT_FOOTER_LEGEND}</span>
                                                    <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                        Printed on: {printedOn}
                                                        {/* <br /> */}
                                                        {/* {transcriptNumber} */}

                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div >
        </>
    );
}

// ─── Semester Block ──────────────────────────────────────────────────────────

function SemesterBlock({
    sem,
    collapsed,
    onToggle,
    showClassDesignation,
    classification,
}: {
    sem: SemesterRunningTotals;
    collapsed: boolean;
    onToggle: () => void;
    showClassDesignation: boolean;
    classification: string;
}) {
    return (
        <div style={{ marginBottom: "6px", pageBreakInside: "avoid" }}>
            {/* Semester heading */}
            <button
                type="button"
                onClick={onToggle}
                className="semester-header-btn"
                style={{
                    width: "100%",
                    background: "transparent",
                    color: "#000",
                    padding: "4px 0 2px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textAlign: "left",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #2e5cb8",
                    marginBottom: "4px",
                }}
                aria-expanded={!collapsed}
            >
                <span>{sem.label}</span>
                <span style={{ fontSize: "10px", opacity: 0.6 }} className="print-hide">
                    {collapsed ? "▶" : "▼"}
                </span>
            </button>

            <div className={collapsed ? "sem-collapsed" : ""}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                        fontSize: "9px",
                    }}
                >
                    <thead>
                        <tr>
                            <th style={{ ...thBase, width: "72px", textAlign: "left" }}>
                                Code
                            </th>
                            <th style={{ ...thBase, textAlign: "left" }}>Course Title</th>
                            <th style={{ ...thBase, width: "44px", textAlign: "center" }}>
                                Credits
                            </th>
                            <th style={{ ...thBase, width: "32px", textAlign: "center" }}>
                                Grade
                            </th>
                            <th style={{ ...thBase, width: "54px", textAlign: "center" }}>
                                Grade Point
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sem.courses.map((course) => (
                            <CourseRow key={course.courseId} course={course} />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td
                                colSpan={5}
                                style={{
                                    ...tdTotals,
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    textAlign: "left",
                                    padding: "4px 8px",
                                }}
                            >
                                TCR: {sem.creditsAttempted.toFixed(2)} &nbsp; TGP:{" "}
                                {sem.totalQualityPoints.toFixed(2)} &nbsp; SGPA:{" "}
                                {sem.sgpaFormatted} &nbsp; CCR:{" "}
                                {sem.cumulativeCreditsAttempted.toFixed(2)} &nbsp; CGV:{" "}
                                {sem.cumulativeQualityPoints.toFixed(2)} &nbsp; CGPA:{" "}
                                {sem.cumulativeGpaFormatted}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {showClassDesignation && (
                    <div
                        style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            fontWeight: 400,
                        }}
                    >
                        <span>
                            Class Designation:{" "}
                            <span style={{ fontWeight: 700 }}>{classification}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Course Row ──────────────────────────────────────────────────────────────

function CourseRow({ course }: { course: TranscriptCourse }) {
    const displayGrade = course.grade === "F" ? "E" : course.grade;

    return (
        <tr style={{ borderBottom: "0.5px solid #ccc" }}>
            <td style={{ ...tdBase, textAlign: "left", fontWeight: 700 }}>
                {course.courseCode}
            </td>
            <td style={{ ...tdBase, textAlign: "left", textTransform: "uppercase" }}>
                {course.courseTitle}
                {!course.isScoring && (
                    <span style={{ marginLeft: "4px", fontSize: "7px", color: "#555" }}>
                        (non-scoring)
                    </span>
                )}
            </td>
            <td style={{ ...tdBase, textAlign: "center" }}>
                {course.creditHours.toFixed(2)}
            </td>
            <td style={{ ...tdBase, textAlign: "center" }}>{displayGrade}</td>
            <td style={{ ...tdBase, textAlign: "center" }}>
                {course.isScoring ? course.qualityPointsFormatted : "0.00"}
            </td>
        </tr>
    );
}

// ─── InfoLine ─────────────────────────────────────────────────────────────────

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: "flex",
                gap: "4px",
                fontSize: "11px",
                lineHeight: 1.6,
                alignItems: "baseline",
            }}
        >
            <span style={{ fontWeight: 700, minWidth: "60px", flexShrink: 0 }}>
                {label}:
            </span>
            <span>{value}</span>
        </div>
    );
}

// ─── LogoCrest (watermark) ───────────────────────────────────────────────────

function LogoCrest({ size = 80, opacity = 1 }: { size?: number; opacity?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ flexShrink: 0, opacity }}
            aria-hidden
        >
            <circle cx="50" cy="50" r="48" fill="#1a237e" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="27" fill="white" fillOpacity="0.12" />
            <text
                x="50"
                y="44"
                textAnchor="middle"
                fontSize="21"
                fontWeight="700"
                fill="white"
                fontFamily="Arial"
            >
                88
            </text>
            <text
                x="50"
                y="57"
                textAnchor="middle"
                fontSize="5.5"
                fill="white"
                fontFamily="Arial"
            >
                EDUCATION FOR SERVICE
            </text>
        </svg>
    );
}

// ─── Print Styles ─────────────────────────────────────────────────────────────

function PrintStyles() {
    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 4mm 4mm;
              @bottom-center {
              content: "Page " counter(page);
              font-size: 8px;
              color: #000;
              font-family: Arial, Helvetica, sans-serif;
            }
            }

            body * { visibility: hidden; }
            #transcript-print-root,
            #transcript-print-root * { visibility: visible; }

            #transcript-print-root {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }

            #transcript-document {
              width: 100%;
              max-width: 100%;
              overflow: visible !important;
              min-height: 100vh;
              // box-shadow: inset 0 0 0 2px #1a237e !important;
              border: none !important;
            }

            thead { display: table-header-group; }
            tbody { display: table-row-group; }

            .sem-collapsed { display: block !important; visibility: visible !important; }
            .print-hide { display: none !important; }
            .semester-header-btn { cursor: default; }

            tr { page-break-inside: avoid; }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
            }}
        />
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
    background: "#d4d4d4",
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 4px",
    border: "0.5px solid #999",
    color: "#000",
};

const tdBase: React.CSSProperties = {
    fontSize: "9px",
    padding: "2px 4px",
    border: "0.5px solid #ccc",
    color: "#000",
};

const tdTotals: React.CSSProperties = {
    background: "#eef1f8",
    border: "0.5px solid #bbc4d8",
    verticalAlign: "middle",
};