/**
 * Client-safe audit log utilities.
 *
 * No DB imports — safe to use in Client Components.
 * The DB query functions stay in lib/audit-log.ts (server-only).
 */

export type ActionCategory =
  | "create"
  | "update"
  | "delete"
  | "auth"
  | "bulk"
  | "transcript"
  | "other";

export function classifyAction(action: string): ActionCategory {
  if (action.startsWith("CREATE")) return "create";
  if (action.startsWith("UPDATE") || action.startsWith("SUPERSEDE"))
    return "update";
  if (action.startsWith("DELETE")) return "delete";
  if (action === "LOGIN" || action === "LOGOUT") return "auth";
  if (action.startsWith("BULK")) return "bulk";
  if (action === "GENERATE_TRANSCRIPT") return "transcript";
  return "other";
}

export const ACTION_CATEGORY_STYLES: Record<
  ActionCategory,
  { bg: string; text: string; dot: string; label: string }
> = {
  create: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Create",
  },
  update: {
    bg: "bg-amber-50   dark:bg-amber-950/60",
    text: "text-amber-700   dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Update",
  },
  delete: {
    bg: "bg-red-50     dark:bg-red-950/60",
    text: "text-red-700     dark:text-red-300",
    dot: "bg-red-500",
    label: "Delete",
  },
  auth: {
    bg: "bg-blue-50    dark:bg-blue-950/60",
    text: "text-blue-700    dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Auth",
  },
  bulk: {
    bg: "bg-purple-50  dark:bg-purple-950/60",
    text: "text-purple-700  dark:text-purple-300",
    dot: "bg-purple-500",
    label: "Bulk",
  },
  transcript: {
    bg: "bg-teal-50    dark:bg-teal-950/60",
    text: "text-teal-700    dark:text-teal-300",
    dot: "bg-teal-500",
    label: "Transcript",
  },
  other: {
    bg: "bg-gray-100   dark:bg-gray-800",
    text: "text-gray-600    dark:text-gray-400",
    dot: "bg-gray-400",
    label: "Other",
  },
};
