"use client";

/**
 * Generate transcript button — client component.
 *
 * Wraps the generateTranscriptAction server action with:
 *  - Pending / loading state (disables button, shows spinner)
 *  - Inline error display
 *  - Redirects to the PDF on success
 */

import { useState, useTransition } from "react";
import { generateTranscriptAction } from "@/actions/transcripts";

type Props = {
  studentId: string;
};

export function GenerateTranscriptButton({ studentId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateTranscriptAction(studentId);

      if (result.status === "error") {
        setError(result.error);
        return;
      }

      if (result.status === "success" && result.data) {
        // Scroll to transcript list — the new entry will be there after revalidation
        document.getElementById("transcript-list")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className={[
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
          "text-white shadow-sm transition-colors focus:outline-none",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isPending
            ? "bg-blue-400"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
        ].join(" ")}
      >
        {isPending ? (
          <>
            <Spinner />
            Generating PDF…
          </>
        ) : (
          <>
            <PDFIcon />
            Generate transcript
          </>
        )}
      </button>

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function PDFIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
