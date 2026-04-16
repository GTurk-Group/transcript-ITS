/**
 * AuditPagination — cursor-based pagination controls.
 *
 * Uses the createdAt timestamp of the last row as the cursor.
 * This is safe because audit logs are append-only — existing rows
 * never change their timestamps.
 *
 * Server component — all navigation is plain <a> links with searchParams.
 */

type Props = {
  hasNextPage:   boolean;
  nextCursor:    string | null;
  prevCursor:    string | null;
  displayCount:  number;
  totalInPage:   number;
  isFiltered:    boolean;
  currentParams: Record<string, string | undefined>;
};

export function AuditPagination({
  hasNextPage,
  nextCursor,
  prevCursor,
  displayCount,
  isFiltered,
  currentParams,
}: Props) {
  if (!hasNextPage && !prevCursor) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Showing {displayCount} entries{isFiltered ? " — filtered" : ""}
      </span>

      <div className="flex items-center gap-3">
        {prevCursor && (
          <a
            href={buildUrl({ ...currentParams, before: undefined })}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft />
            Latest
          </a>
        )}

        {nextCursor && (
          <a
            href={buildUrl({ ...currentParams, before: nextCursor })}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Next page
            <ChevronRight />
          </a>
        )}
      </div>
    </div>
  );
}

function buildUrl(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/audit?${s}` : "/audit";
}

function ChevronLeft() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
