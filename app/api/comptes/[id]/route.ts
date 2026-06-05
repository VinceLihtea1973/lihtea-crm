import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await requireTenant();
  await prisma.company.delete({
    where: { id: params.id, tenantId },
  });
  return NextResponse.json({ ok: true });
}
