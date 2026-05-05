import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const { content, type } = await request.json();
    if (!content) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });

    const note = await prisma.prospectNote.create({
      data: { prospectId: id, content, type: type || "NOTE" },
    });

    // Update lastInteraction on the prospect
    await prisma.prospect.update({
      where: { id },
      data: { lastInteraction: new Date() },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "noteId requis" }, { status: 400 });
    await prisma.prospectNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
