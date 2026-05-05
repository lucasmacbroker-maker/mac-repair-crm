import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: "desc" } }, _count: { select: { notes: true } } },
    });
    if (!prospect) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(prospect);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    const fields = [
      "firstName","lastName","email","phone","company","position",
      "linkedinUrl","source","status","priority","temperature",
      "needsCallback","revenuePotential",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const dateFields = ["firstContactDate","lastInteraction","nextFollowUp","conversionDeadline"];
    for (const f of dateFields) {
      if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null;
    }

    const prospect = await prisma.prospect.update({
      where: { id },
      data,
      include: { notes: { orderBy: { createdAt: "desc" } }, _count: { select: { notes: true } } },
    });
    return NextResponse.json(prospect);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    await prisma.prospect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
