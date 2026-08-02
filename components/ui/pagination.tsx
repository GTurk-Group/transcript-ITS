/**
 * components/ui/pagination.tsx
 *
 * Reusable client-side pagination component.
 * Used by courses, programmes, and semesters pages.
 *
 * Usage:
 *   const { page, perPage, setPage, setPerPage, paginated, total, totalPages } = usePagination(items);
 *   ...render paginated...
 *   <Pagination page={page} perPage={perPage} total={total} totalPages={totalPages}
 *               onPage={setPage} onPerPage={setPerPage} />
 */

"use client";

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

type PaginationProps = {
    page: number;
    perPage: PerPage;
    total: number;
    totalPages: number;
    onPage: (p: number) => void;
    onPerPage: (n: PerPage) => void;
};

export function Pagination({ page, perPage, total, totalPages, onPage, onPerPage }: PaginationProps) {
    if (total === 0) return null;

    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    // Build page number window — show at most 5 pages
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">

            {/* Left: showing X–Y of Z */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span> of{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
            </p>

            <div className="flex items-center gap-3">
                {/* Per-page selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Show</span>
                    <select
                        value={perPage}
                        onChange={(e) => {
                            onPerPage(Number(e.target.value) as PerPage);
                            onPage(1); // reset to first page when changing page size
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                        {PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-500 dark:text-gray-400">per page</span>
                </div>

                {/* Page buttons */}
                {totalPages > 1 && (
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                        {/* Prev */}
                        <button
                            type="button"
                            onClick={() => onPage(page - 1)}
                            disabled={page === 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
                            aria-label="Previous page"
                        >
                            <ChevLeft />
                        </button>

                        {/* Page numbers */}
                        {pages.map((p, i) =>
                            p === "…" ? (
                                <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                            ) : (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => onPage(p)}
                                    aria-current={p === page ? "page" : undefined}
                                    className={[
                                        "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                                        p === page
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400",
                                    ].join(" ")}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        {/* Next */}
                        <button
                            type="button"
                            onClick={() => onPage(page + 1)}
                            disabled={page === totalPages}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
                            aria-label="Next page"
                        >
                            <ChevRight />
                        </button>
                    </nav>
                )}
            </div>
        </div>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { useState } from "react";

/**
 * usePagination — manages page + perPage state and slices an array.
 *
 * @param items  The full array of items to paginate (client-side).
 * @returns      Everything needed to render a paginated list + the Pagination component.
 */
export function usePagination<T>(items: T[], defaultPerPage: PerPage = 10) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<PerPage>(defaultPerPage);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    // Clamp page to valid range if items change
    const safePage = Math.min(page, totalPages);
    const paginated = items.slice((safePage - 1) * perPage, safePage * perPage);

    return {
        page: safePage,
        perPage,
        total,
        totalPages,
        paginated,
        setPage,
        setPerPage: (n: PerPage) => { setPerPage(n); setPage(1); },
    };
}

function ChevLeft() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>; }
function ChevRight() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>; }