/**
 * POST /api/admin/registrar        — create registrar
 * PATCH /api/admin/registrar/[id]  — update details or toggle isActive
 * SUPER_ADMIN only.
 *
 * When setting isActive: true, all other registrars are deactivated in the
 * same transaction so there is always at most one active registrar.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { registrar } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";

async function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? await verifyToken(token) : null;
}

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  signaturePath: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = bodySchema.parse(await request.json());
  if (!body.name || !body.title) {
    return NextResponse.json(
      { error: "Name and title are required." },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(registrar)
    .values({
      name: body.name,
      title: body.title,
      signaturePath: body.signaturePath ?? null,
      isActive: false,
    })
    .returning();

  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_INSTITUTION",
    entity: "registrar",
    entityId: created.id,
    after: { name: created.name, title: created.title },
    ...extractRequestMeta(request.headers),
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = bodySchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(registrar)
    .where(eq(registrar.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json({ error: "Registrar not found" }, { status: 404 });

  // If activating, deactivate all others first
  if (body.isActive === true) {
    await db
      .update(registrar)
      .set({ isActive: false })
      .where(ne(registrar.id, id));
  }

  const updates: Partial<typeof existing> = {};
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
    before: {
      name: existing.name,
      title: existing.title,
      isActive: existing.isActive,
    },
    after: {
      name: updated.name,
      title: updated.title,
      isActive: updated.isActive,
    },
    ...extractRequestMeta(request.headers),
  });

  return NextResponse.json(updated);
}
