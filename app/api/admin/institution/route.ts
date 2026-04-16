/**
 * PATCH /api/admin/institution — update institution details
 * POST  /api/admin/institution — create institution record
 * SUPER_ADMIN only.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { institution } from "@/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().nullable().optional(),
  logoPath: z.string().nullable().optional(),
});

async function getSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? await verifyToken(token) : null;
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError ? err.issues[0].message : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const [created] = await db
    .insert(institution)
    .values({
      name: body.name,
      address: body.address ?? null,
      logoPath: body.logoPath ?? null,
    })
    .returning();

  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_INSTITUTION",
    entity: "institution",
    entityId: created.id,
    after: { name: body.name, address: body.address, logoPath: body.logoPath },
    ...extractRequestMeta(request.headers),
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError ? err.issues[0].message : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const existing = await db.select().from(institution).limit(1);
  if (existing.length === 0)
    return NextResponse.json(
      { error: "No institution record. Use POST to create one." },
      { status: 404 },
    );

  const before = existing[0];
  const [updated] = await db
    .update(institution)
    .set({
      name: body.name,
      address: body.address ?? null,
      logoPath: body.logoPath ?? null,
    })
    .where(eq(institution.id, before.id))
    .returning();

  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_INSTITUTION",
    entity: "institution",
    entityId: updated.id,
    before: {
      name: before.name,
      address: before.address,
      logoPath: before.logoPath,
    },
    after: { name: body.name, address: body.address, logoPath: body.logoPath },
    ...extractRequestMeta(request.headers),
  });

  return NextResponse.json({ id: updated.id }, { status: 200 });
}
