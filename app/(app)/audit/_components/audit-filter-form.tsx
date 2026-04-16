/**
 * AuditFilterForm — filter bar for the audit log viewer.
 *
 * Server component — renders the filter form with current values
 * populated from searchParams. Submits as a GET form so filters
 * are reflected in the URL and can be bookmarked / shared.
 *
 * Active filters shown as dismissible pills below the form.
 */

import { AUDIT_ENTITIES, AUDIT_ACTIONS } from "@/lib/audit-log";

type Props = {
  action?:  string;
  entity?:  string;
  actor?:   string;
  from?:    string;
  to?:      string;
  actors:   { id: string; email: string }[];
};

export function AuditFilterForm({ action, entity, actor, from, to, actors }: Props) {
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (action) activeFilters.push({ key: "action", label: "Action",  value: action });
  if (entity) activeFilters.push({ key: "entity", label: "Entity",  value: entity });
  if (actor)  activeFilters.push({ key: "actor",  label: "Actor",   value: actor  });
  if (from)   activeFilters.push({ key: "from",   label: "From",    value: from   });
  if (to)     activeFilters.push({ key: "to",     label: "To",      value: to     });

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="space-y-3">
      {/* Filter form */}
      <form method="GET" className="flex flex-wrap items-end gap-3">

        {/* Actor dropdown */}
        <FilterSelect
          label="Actor"
          name="actor"
          value={actor}
          options={[
            { value: "", label: "All actors" },
            ...actors.map((a) => ({ value: a.email, label: a.email })),
          ]}
        />

        {/* Action dropdown */}
        <FilterSelect
          label="Action"
          name="action"
          value={action}
          options={[
            { value: "", label: "All actions" },
            ...AUDIT_ACTIONS.map((a) => ({ value: a, label: a })),
          ]}
        />

        {/* Entity dropdown */}
        <FilterSelect
          label="Entity"
          name="entity"
          value={entity}
          options={[
            { value: "", label: "All entities" },
            ...AUDIT_ENTITIES.map((e) => ({ value: e, label: e })),
          ]}
        />

        {/* Date range */}
        <FilterInput label="From" name="from" value={from} type="date" />
        <FilterInput label="To"   name="to"   value={to}   type="date" />

        {/* Apply */}
        <button
          type="submit"
          className="h-9 rounded-lg bg-gray-900 px-5 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Apply
        </button>

        {/* Clear all */}
        {hasFilters && (
          <a
            href="/audit"
            className="flex h-9 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Clear all
          </a>
        )}
      </form>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
          {activeFilters.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              value={f.value}
              removeHref={buildClearUrl(f.key, { action, entity, actor, from, to })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildClearUrl(
  clearKey: string,
  filters: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (k !== clearKey && v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect({
  label, name, value, options,
}: {
  label:   string;
  name:    string;
  value?:  string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <select
        name={name}
        defaultValue={value ?? ""}
        className={[
          "h-9 min-w-[140px] rounded-lg border px-2.5 text-sm transition-colors",
          "bg-white text-gray-900 border-gray-300",
          "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent",
          "dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700",
          "dark:focus:ring-gray-400",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FilterInput({
  label, name, value, type = "text",
}: {
  label:  string;
  name:   string;
  value?: string;
  type?:  string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={value ?? ""}
        className={[
          "h-9 rounded-lg border px-3 text-sm transition-colors",
          "bg-white text-gray-900 border-gray-300 placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent",
          "dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700",
          "dark:focus:ring-gray-400",
        ].join(" ")}
      />
    </div>
  );
}

function FilterPill({
  label, value, removeHref,
}: {
  label:      string;
  value:      string;
  removeHref: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
      <span className="text-blue-500 dark:text-blue-500">{label}:</span>
      <span className="max-w-[140px] truncate">{value}</span>
      <a
        href={removeHref}
        className="ml-0.5 rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-900 dark:hover:text-blue-300"
        title={`Remove ${label} filter`}
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </a>
    </span>
  );
}
