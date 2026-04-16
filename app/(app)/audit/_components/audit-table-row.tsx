"use client";

/**
 * AuditTableRow — a single row in the audit log table.
 *
 * Client component because:
 *   - Expanded diff state is local to each row
 *   - User-agent tooltip uses hover state
 *   - Full entity ID reveals on click
 */

import { useState } from "react";
import { AuditDiffViewer } from "./audit-diff-viewer";
import { classifyAction, ACTION_CATEGORY_STYLES } from "@/lib/audit-log-utils";
import type { AuditRow } from "@/lib/audit-log";

type Props = { row: AuditRow };

export function AuditTableRow({ row }: Props) {
  const [expanded, setExpanded]   = useState(false);
  const [showId,   setShowId]     = useState(false);
  const hasDiff = row.before != null || row.after != null;

  const cat    = classifyAction(row.action);
  const styles = ACTION_CATEGORY_STYLES[cat];

  const formattedTime = row.createdAt.toLocaleString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <>
      {/* Main row */}
      <tr
        className={[
          "transition-colors",
          expanded
            ? "bg-gray-50/80 dark:bg-gray-800/40"
            : "hover:bg-gray-50/60 dark:hover:bg-gray-800/20",
        ].join(" ")}
      >
        {/* Timestamp */}
        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
          {formattedTime}
        </td>

        {/* Actor */}
        <td className="px-4 py-3">
          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]" title={row.adminEmail}>
            {row.adminEmail}
          </p>
          <RolePill role={row.adminRole} />
        </td>

        {/* Action */}
        <td className="whitespace-nowrap px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
            {row.action}
          </span>
        </td>

        {/* Entity */}
        <td className="px-4 py-3">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.entity}</span>
        </td>

        {/* Entity ID */}
        <td className="px-4 py-3">
          {row.entityId ? (
            <button
              type="button"
              onClick={() => setShowId((v) => !v)}
              className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300"
              title={showId ? "Click to hide" : "Click to reveal full ID"}
            >
              {showId ? row.entityId : `${row.entityId.slice(0, 8)}…`}
            </button>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
          )}
        </td>

        {/* IP */}
        <td className="px-4 py-3">
          {row.ipAddress ? (
            <span
              className="font-mono text-xs text-gray-400 dark:text-gray-600"
              title={row.userAgent ?? undefined}
            >
              {row.ipAddress}
            </span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
          )}
        </td>

        {/* Diff toggle */}
        <td className="px-4 py-3 text-right">
          {hasDiff ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={[
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                expanded
                  ? "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800",
              ].join(" ")}
              aria-expanded={expanded}
            >
              <DiffIcon />
              {expanded ? "Hide" : "Diff"}
            </button>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
          )}
        </td>
      </tr>

      {/* Expanded diff panel */}
      {expanded && (
        <tr>
          <td
            colSpan={7}
            className="border-b border-gray-100 bg-gray-50/60 px-4 pb-4 pt-0 dark:border-gray-800 dark:bg-gray-900/40"
          >
            <AuditDiffViewer
              before={row.before}
              after={row.after}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Role pill ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  ADMIN:       "bg-blue-50   text-blue-700   dark:bg-blue-950   dark:text-blue-300",
  VIEWER:      "bg-gray-100  text-gray-600   dark:bg-gray-800   dark:text-gray-400",
};

function RolePill({ role }: { role: string }) {
  return (
    <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-xs ${ROLE_STYLES[role] ?? ROLE_STYLES.VIEWER}`}>
      {role.replace("_", " ")}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function DiffIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6m0 0V3m0 4L3 3m12 4h6m-6 0V3m0 4l6-4M3 17h6m0 0v4m0-4L3 21m12-4h6m-6 0v4m0-4l6 4" />
    </svg>
  );
}