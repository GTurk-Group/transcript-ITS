/**
 * POST /api/admin/registrar — create a new registrar record
 * SUPER_ADMIN only.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { registrar } from "@/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  signaturePath: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0].message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 400 });
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
