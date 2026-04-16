"use client";

/**
 * AuditDiffViewer — renders the before/after JSONB fields as a readable diff.
 *
 * Three modes depending on what data is present:
 *   - Both before + after  → two-column side-by-side diff
 *   - Only after           → single "Created" panel (green)
 *   - Only before          → single "Deleted" panel (red)
 *
 * Key-level diff: keys that differ between before/after are highlighted.
 * Keys that are the same are shown in muted text.
 * New keys (in after, not in before) are shown in green.
 * Removed keys (in before, not in after) are shown in red.
 */

import { useState, useCallback } from "react";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

type Props = {
  before: Record<string, unknown> | null;
  after:  Record<string, unknown> | null;
};

export function AuditDiffViewer({ before, after }: Props) {
  const [copied, setCopied] = useState<"before" | "after" | null>(null);
  const [mode, setMode] = useState<"diff" | "raw">("diff");

  const copyJson = useCallback(async (which: "before" | "after") => {
    const data = which === "before" ? before : after;
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {/* ignore */}
  }, [before, after]);

  if (before == null && after == null) return null;

  // Collect all top-level keys across both objects
  const beforeKeys = before ? Object.keys(before) : [];
  const afterKeys  = after  ? Object.keys(after)  : [];
  const allKeys    = [...new Set([...beforeKeys, ...afterKeys])].sort();

  const changedKeys = new Set(
    allKeys.filter((k) => {
      const b = before?.[k];
      const a = after?.[k];
      return JSON.stringify(b) !== JSON.stringify(a);
    })
  );

  return (
    <div className="mt-2 space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded border border-gray-200 dark:border-gray-700">
          {(["diff", "raw"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                "px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                mode === m
                  ? "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              {m}
            </button>
          ))}
        </div>
        {changedKeys.size > 0 && mode === "diff" && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {changedKeys.size} field{changedKeys.size !== 1 ? "s" : ""} changed
          </span>
        )}
      </div>

      {mode === "raw" ? (
        /* Raw JSON panels */
        <div className={`grid gap-3 ${before && after ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {before && (
            <JsonPanel
              label="Before"
              data={before}
              variant="before"
              onCopy={() => copyJson("before")}
              copied={copied === "before"}
            />
          )}
          {after && (
            <JsonPanel
              label={before ? "After" : "Created"}
              data={after}
              variant="after"
              onCopy={() => copyJson("after")}
              copied={copied === "after"}
            />
          )}
        </div>
      ) : (
        /* Structured key-diff table */
        <div className="overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-1/4">Field</th>
                {before && <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-red-500 dark:text-red-400">Before</th>}
                {after  && <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">After</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white dark:divide-gray-800/50 dark:bg-gray-900">
              {allKeys.map((key) => {
                const bVal = before?.[key];
                const aVal = after?.[key];
                const changed  = changedKeys.has(key);
                const added    = !(key in (before ?? {})) && key in (after ?? {});
                const removed  = key in (before ?? {}) && !(key in (after ?? {}));

                return (
                  <tr
                    key={key}
                    className={[
                      changed ? "bg-amber-50/40 dark:bg-amber-950/20" : "",
                      added   ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "",
                      removed ? "bg-red-50/40 dark:bg-red-950/20" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {changed && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                        {added   && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                        {removed && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                        {!changed && !added && !removed && <span className="h-1.5 w-1.5 shrink-0" />}
                        <span className={`font-mono ${changed || added || removed ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500"}`}>
                          {key}
                        </span>
                      </div>
                    </td>
                    {before && (
                      <td className={`px-3 py-2 font-mono ${removed ? "text-red-600 dark:text-red-400" : changed ? "text-red-500 dark:text-red-400 line-through opacity-60" : "text-gray-500 dark:text-gray-500"}`}>
                        {bVal !== undefined ? renderValue(bVal) : <span className="text-gray-300 dark:text-gray-700 italic">—</span>}
                      </td>
                    )}
                    {after && (
                      <td className={`px-3 py-2 font-mono ${added ? "text-emerald-600 dark:text-emerald-400" : changed ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-gray-500 dark:text-gray-500"}`}>
                        {aVal !== undefined ? renderValue(aVal) : <span className="text-gray-300 dark:text-gray-700 italic">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── JSON panel ───────────────────────────────────────────────────────────────

function JsonPanel({
  label, data, variant, onCopy, copied,
}: {
  label:   string;
  data:    Record<string, unknown>;
  variant: "before" | "after";
  onCopy:  () => void;
  copied:  boolean;
}) {
  const isBefore = variant === "before";
  const border   = isBefore ? "border-red-200 dark:border-red-900" : "border-emerald-200 dark:border-emerald-900";
  const header   = isBefore ? "bg-red-50 dark:bg-red-950/40" : "bg-emerald-50 dark:bg-emerald-950/40";
  const labelCls = isBefore ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300";

  return (
    <div className={`overflow-hidden rounded-lg border ${border}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${header}`}>
        <span className={`text-xs font-semibold ${labelCls}`}>{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className={`text-xs ${labelCls} hover:underline`}
          title="Copy JSON"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className={`overflow-auto p-3 text-xs leading-relaxed ${isBefore ? "text-red-800 dark:text-red-300" : "text-emerald-800 dark:text-emerald-300"}`}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ─── Value renderer ───────────────────────────────────────────────────────────

function renderValue(val: unknown): string {
  if (val === null)             return "null";
  if (typeof val === "string") {
    // Truncate long strings like UUIDs and paths
    if (val.length > 60) return `"${val.slice(0, 57)}…"`;
    return `"${val}"`;
  }
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number")  return String(val);
  if (Array.isArray(val))       return `[…] (${val.length})`;
  if (typeof val === "object")  return `{…} (${Object.keys(val as object).length} keys)`;
  return String(val);
}
