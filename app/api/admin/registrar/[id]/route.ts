/**
 * PATCH /api/admin/registrar/[id] — update registrar details or toggle active
 * SUPER_ADMIN only. Activating one registrar deactivates all others.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { registrar } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  signaturePath: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0].message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(registrar)
    .where(eq(registrar.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Registrar not found" }, { status: 404 });
  }

  // Enforce one active registrar at a time
  if (body.isActive === true) {
    await db
      .update(registrar)
      .set({ isActive: false })
      .where(ne(registrar.id, id));
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.title !== undefined) updates.title = body.title;
  if (body.signaturePath !== undefined)
    updates.signaturePath = body.signaturePath;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(registrar)
    .set(updates)
    .where(eq(registrar.id, id))
    .returning();

  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_INSTITUTION",
    entity: "registrar",
    entityId: id,
    before: { name: existing.name, isActive: existing.isActive },
    after: { name: updated.name, isActive: updated.isActive },
    ...extractRequestMeta(request.headers),
  });

  return NextResponse.json(updated);
}
