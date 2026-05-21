"use server";

/**
 * Authentication server actions.
 *
 * loginAction    — verifies credentials, enforces rate limiting, creates session
 * logoutAction   — clears session cookie + audit log
 * changePasswordAction — allows admins to change their own password
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  comparePassword,
  hashPassword,
  DUMMY_HASH,
} from "@/lib/auth/passwords";
import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap-admin";
import { createSession, clearSession, getSession } from "@/lib/auth/session";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { rateLimit, clearRateLimit, loginRateLimitKey } from "@/lib/rate-limit";
import type { ActionState } from "@/types/auth";

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";
  const meta = extractRequestMeta(headerStore);

  // ── Rate limit: 5 attempts per 15 minutes per IP ──────────────────────────
  const limit = await rateLimit(loginRateLimitKey(ip), {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return {
      status: "error",
      error: `Too many login attempts. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!email || !password) {
    return { status: "error", error: "Email and password are required." };
  }

  // ── Fetch admin ───────────────────────────────────────────────────────────
  let [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (!admin) {
    await ensureBootstrapAdmin(email);
    [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
  }

  // Timing-safe: always run bcrypt even when no user found
  const hashToCompare = admin?.password ?? DUMMY_HASH;
  const passwordMatch = await comparePassword(password, hashToCompare);

  if (!admin || !passwordMatch) {
    return { status: "error", error: "Invalid email or password." };
  }

  if (!admin.isActive) {
    return {
      status: "error",
      error: "This account has been disabled. Contact a system administrator.",
    };
  }

  // ── Success — clear rate limit counter and create session ─────────────────
  await clearRateLimit(loginRateLimitKey(ip));

  await createSession({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  await logAuditEvent({
    adminId: admin.id,
    action: "LOGIN",
    entity: "admins",
    entityId: admin.id,
    after: { email: admin.email, role: admin.role },
    ...meta,
  });

  redirect("/dashboard");
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    const headerStore = await headers();
    await logAuditEvent({
      adminId: session.adminId,
      action: "LOGOUT",
      entity: "admins",
      entityId: session.adminId,
      ...extractRequestMeta(headerStore),
    });
  }
  await clearSession();
  redirect("/login");
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", error: "Not authenticated." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) {
    return { status: "error", error: "All fields are required." };
  }
  if (next.length < 8) {
    return {
      status: "error",
      error: "New password must be at least 8 characters.",
    };
  }
  if (next !== confirm) {
    return { status: "error", error: "New passwords do not match." };
  }
  if (current === next) {
    return {
      status: "error",
      error: "New password must be different from the current password.",
    };
  }

  // Fetch current hash
  const [admin] = await db
    .select({ id: admins.id, password: admins.password })
    .from(admins)
    .where(eq(admins.id, session.adminId))
    .limit(1);

  if (!admin) return { status: "error", error: "Account not found." };

  const valid = await comparePassword(current, admin.password);
  if (!valid)
    return { status: "error", error: "Current password is incorrect." };

  const hashed = await hashPassword(next);

  await db
    .update(admins)
    .set({ password: hashed })
    .where(eq(admins.id, session.adminId));

  const headerStore = await headers();
  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_ADMIN",
    entity: "admins",
    entityId: session.adminId,
    after: { passwordChanged: true },
    ...extractRequestMeta(headerStore),
  });

  return { status: "success" };
}
