import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const macbook = await prisma.macBookForSale.update({
      where: { id },
      data: {
        model: body.model,
        year: body.year,
        specs: body.specs,
        condition: body.condition,
        originalPrice: body.originalPrice !== undefined ? parseFloat(body.originalPrice) : undefined,
        promoPrice: body.promoPrice !== undefined ? parseFloat(body.promoPrice) : undefined,
        status: body.status,
        notes: body.notes,
        ...(body.photos !== undefined ? { photos: body.photos } : {}),
      },
    });
    return NextResponse.json(macbook);
  } catch (error) {
    console.error("Update macbook error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    await prisma.macBookForSale.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete macbook error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
