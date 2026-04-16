/**
 * AuditStatsBar — summary metrics shown above the filter/table.
 *
 * Pure server component — receives pre-fetched stats as props.
 * No client-side state needed.
 */

import type { AuditStats } from "@/lib/audit-log";

type Props = { stats: AuditStats };

export function AuditStatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      <StatCell
        label="Total entries"
        value={stats.totalEntries.toLocaleString()}
        dotColor="bg-gray-400"
      />
      <StatCell
        label="Creates"
        value={stats.createCount.toLocaleString()}
        dotColor="bg-emerald-500"
        textColor="text-emerald-700 dark:text-emerald-400"
      />
      <StatCell
        label="Updates"
        value={stats.updateCount.toLocaleString()}
        dotColor="bg-amber-500"
        textColor="text-amber-700 dark:text-amber-400"
      />
      <StatCell
        label="Deletes"
        value={stats.deleteCount.toLocaleString()}
        dotColor="bg-red-500"
        textColor="text-red-700 dark:text-red-400"
      />
      <StatCell
        label="Logins"
        value={stats.loginCount.toLocaleString()}
        dotColor="bg-blue-500"
        textColor="text-blue-700 dark:text-blue-400"
      />
      <StatCell
        label="Unique actors"
        value={stats.uniqueActors.toLocaleString()}
        dotColor="bg-purple-500"
        textColor="text-purple-700 dark:text-purple-400"
      />
    </div>
  );
}

function StatCell({
  label, value, dotColor, textColor = "text-gray-900 dark:text-gray-100",
}: {
  label:       string;
  value:       string;
  dotColor:    string;
  textColor?:  string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${textColor}`}>{value}</p>
    </div>
  );
}
