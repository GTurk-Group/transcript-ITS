"use client";

/**
 * TemplateDownloadButton — client component.
 *
 * A single reusable button for downloading a CSV template from any of the
 * /api/templates/* endpoints. Used on the upload pages and the consolidated
 * templates page.
 *
 * Uses fetch() + blob URL rather than a plain <a href> so we can:
 *   - Show a loading state while the server generates the file
 *   - Handle 401 / 403 gracefully with a user-facing message
 *   - Programmatically set the filename from the Content-Disposition header
 *
 * Props:
 *   endpoint  — /api/templates/students or /api/templates/grades
 *   filename  — default filename if the server does not send Content-Disposition
 *   label     — button text
 *   variant   — "primary" (filled) or "outline" (border only)
 */

import { useState } from "react";

type Props = {
  endpoint: string;
  filename: string;
  label?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
};

export function TemplateDownloadButton({
  endpoint,
  filename,
  label = "Download template",
  variant = "outline",
  size = "sm",
}: Props) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async () => {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(endpoint, { method: "GET", credentials: "include" });

      if (res.status === 401) throw new Error("You must be logged in to download templates.");
      if (res.status === 403) throw new Error("You do not have permission to download templates.");
      if (!res.ok) throw new Error(`Download failed (${res.status}). Please try again.`);

      // Extract filename from Content-Disposition if present
      const disposition = res.headers.get("content-disposition") ?? "";
      const nameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
      const dlFilename = nameMatch?.[1]?.trim() ?? filename;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dlFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed.";
      setErrorMsg(msg);
      setState("error");
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2   text-sm gap-2",
  }[size];

  const variantClasses = {
    primary: [
      "bg-blue-600 text-white border-transparent",
      "hover:bg-blue-700 active:bg-blue-800",
      "disabled:bg-blue-400",
    ].join(" "),
    outline: [
      "bg-white text-gray-700 border-gray-300 shadow-sm",
      "hover:bg-gray-50 active:bg-gray-100",
      "disabled:opacity-60",
    ].join(" "),
  }[variant];

  const isLoading = state === "loading";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={[
          "inline-flex items-center rounded-lg border font-medium",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "disabled:cursor-not-allowed",
          sizeClasses,
          variantClasses,
        ].join(" ")}
        aria-label={`${label} (CSV)`}
      >
        {isLoading ? <SpinnerIcon size={size} /> : <DownloadIcon size={size} />}
        {isLoading ? "Downloading…" : label}
      </button>

      {state === "error" && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function DownloadIcon({ size }: { size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg className={dim} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function SpinnerIcon({ size }: { size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg className={`${dim} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
