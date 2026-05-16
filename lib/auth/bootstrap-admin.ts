import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword } from "@/lib/auth/passwords";

type AdminRole = "SUPER_ADMIN" | "ADMIN" | "VIEWER";

const ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "VIEWER"];

function getBootstrapCredentials() {
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const role = (process.env.SUPER_ADMIN_ROLE ?? "SUPER_ADMIN") as AdminRole;

  if (!email || !password || password.length < 8 || !ROLES.includes(role)) {
    return null;
  }

  return { email, password, role };
}

/**
 * Creates the first admin account from environment variables.
 * This only runs when there are no admin rows yet, so normal login stays DB-backed.
 */
export async function ensureBootstrapAdmin(loginEmail?: string) {
  const credentials = getBootstrapCredentials();
  if (!credentials) return null;
  if (loginEmail && loginEmail.toLowerCase().trim() !== credentials.email) {
    return null;
  }

  const existingAdmins = await db.select({ id: admins.id }).from(admins).limit(1);
  if (existingAdmins.length > 0) return null;

  const hashed = await hashPassword(credentials.password);

  try {
    const [admin] = await db
      .insert(admins)
      .values({
        email: credentials.email,
        password: hashed,
        role: credentials.role,
      })
      .returning({
        id: admins.id,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
      });

    return admin;
  } catch {
    const [admin] = await db
      .select({
        id: admins.id,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
      })
      .from(admins)
      .where(eq(admins.email, credentials.email))
      .limit(1);

    return admin ?? null;
  }
}
