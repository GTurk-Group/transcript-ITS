/**
 * Audit log data access.
 *
 * All DB queries for the audit viewer live here.
 * The page and components work from typed results only — no raw Drizzle
 * calls outside this file.
 *
 * Permission is enforced upstream in the page (requirePermission).
 * This module has no auth concerns — it only fetches and shapes data.
 */

import { db } from "@/db";
import { auditLogs, admins } from "@/db/schema";
import { desc, eq, and, gte, lte, ilike, count, sql } from "drizzle-orm";
import type { AuditAction } from "@/lib/audit";

export const PAGE_SIZE = 50;

// ─── Filter params ────────────────────────────────────────────────────────────

export type AuditFilters = {
  action?: string; // partial match on action string
  entity?: string; // exact match
  actor?: string; // partial match on admin email
  from?: string; // ISO date string
  to?: string; // ISO date string
  before?: string; // cursor: ISO timestamp of last row seen (for pagination)
};

// ─── Row type returned to UI ──────────────────────────────────────────────────

export type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  adminId: string;
  adminEmail: string;
  adminRole: string;
};

// ─── Stats shown in the summary bar ──────────────────────────────────────────

export type AuditStats = {
  totalEntries: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  loginCount: number;
  uniqueActors: number;
};

// ─── Query: paginated rows ────────────────────────────────────────────────────

export async function queryAuditRows(filters: AuditFilters): Promise<{
  rows: AuditRow[];
  hasNextPage: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}> {
  const conds: ReturnType<typeof eq>[] = [];

  if (filters.action)
    conds.push(ilike(auditLogs.action, `%${filters.action}%`));
  if (filters.entity) conds.push(eq(auditLogs.entity, filters.entity));
  if (filters.actor) conds.push(ilike(admins.email, `%${filters.actor}%`));
  if (filters.from)
    conds.push(gte(auditLogs.createdAt, new Date(filters.from)));
  if (filters.to)
    conds.push(lte(auditLogs.createdAt, new Date(filters.to + "T23:59:59")));
  if (filters.before)
    conds.push(lte(auditLogs.createdAt, new Date(filters.before)));

  const raw = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      before: auditLogs.before,
      after: auditLogs.after,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      adminId: auditLogs.adminId,
      adminEmail: admins.email,
      adminRole: admins.role,
    })
    .from(auditLogs)
    .innerJoin(admins, eq(auditLogs.adminId, admins.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasNextPage = raw.length > PAGE_SIZE;
  const rows = raw.slice(0, PAGE_SIZE) as AuditRow[];

  const nextCursor = hasNextPage
    ? rows[rows.length - 1].createdAt.toISOString()
    : null;

  return {
    rows,
    hasNextPage,
    nextCursor,
    prevCursor: filters.before ?? null,
  };
}

// ─── Query: stats ─────────────────────────────────────────────────────────────

/**
 * Aggregate stats for the stats bar at the top of the page.
 * Runs a single GROUP BY query rather than multiple COUNT queries.
 */
export async function queryAuditStats(): Promise<AuditStats> {
  const [totals, actors] = await Promise.all([
    db
      .select({
        total: count(),
        creates:
          sql<number>`count(*) filter (where ${auditLogs.action} like 'CREATE%')`.mapWith(
            Number,
          ),
        updates:
          sql<number>`count(*) filter (where ${auditLogs.action} like 'UPDATE%' or ${auditLogs.action} like 'SUPERSEDE%')`.mapWith(
            Number,
          ),
        deletes:
          sql<number>`count(*) filter (where ${auditLogs.action} like 'DELETE%')`.mapWith(
            Number,
          ),
        logins:
          sql<number>`count(*) filter (where ${auditLogs.action} = 'LOGIN')`.mapWith(
            Number,
          ),
      })
      .from(auditLogs),

    db.selectDistinct({ adminId: auditLogs.adminId }).from(auditLogs),
  ]);

  return {
    totalEntries: totals[0]?.total ?? 0,
    createCount: totals[0]?.creates ?? 0,
    updateCount: totals[0]?.updates ?? 0,
    deleteCount: totals[0]?.deletes ?? 0,
    loginCount: totals[0]?.logins ?? 0,
    uniqueActors: actors.length,
  };
}

// ─── Query: distinct actors for filter dropdown ───────────────────────────────

export async function queryAuditActors(): Promise<
  { id: string; email: string }[]
> {
  const rows = await db
    .selectDistinct({ id: admins.id, email: admins.email })
    .from(auditLogs)
    .innerJoin(admins, eq(auditLogs.adminId, admins.id))
    .orderBy(admins.email);

  return rows;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUDIT_ENTITIES = [
  "admins",
  "courses",
  "grades",
  "programmes",
  "semesters",
  "students",
  "transcripts",
] as const;

export const AUDIT_ACTIONS: AuditAction[] = [
  "LOGIN",
  "LOGOUT",
  "CREATE_STUDENT",
  "UPDATE_STUDENT",
  "DELETE_STUDENT",
  "CREATE_GRADE",
  "UPDATE_GRADE",
  "SUPERSEDE_GRADE",
  "DELETE_GRADE",
  "CREATE_COURSE",
  "UPDATE_COURSE",
  "DELETE_COURSE",
  "CREATE_PROGRAMME",
  "UPDATE_PROGRAMME",
  "DELETE_PROGRAMME",
  "CREATE_SEMESTER",
  "UPDATE_SEMESTER",
  "DELETE_SEMESTER",
  "GENERATE_TRANSCRIPT",
  "BULK_UPLOAD_STARTED",
  "BULK_UPLOAD_COMPLETED",
  "CREATE_ADMIN",
  "UPDATE_ADMIN",
  "DISABLE_ADMIN",
  "UPDATE_INSTITUTION",
];

// ─── Action classification helpers ───────────────────────────────────────────
// Moved to lib/audit-log-utils.ts (client-safe, no DB imports).
// Re-exported here so server-side imports keep working unchanged.

export { classifyAction, ACTION_CATEGORY_STYLES } from "./audit-log-utils";
export type { ActionCategory } from "./audit-log-utils";
