import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { content, isInternal } = await request.json();

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Le contenu de la note est requis" }, { status: 400 });
  }
  const exists = await prisma.buyback.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });

  const note = await prisma.buybackNote.create({
    data: { buybackId: id, userId: user.id, content: String(content).trim(), isInternal: isInternal !== false },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}
