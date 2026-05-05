import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveFile, deleteFile, validateFileType, validateFileSize } from "@/lib/attachments";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });

    if (!validateFileType(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorisé (PDF, PNG, JPG uniquement)" }, { status: 400 });
    }
    if (!validateFileSize(file.size)) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storedName, url } = await saveFile(buffer, file.type);

    const attachment = await prisma.prospectAttachment.create({
      data: {
        prospectId: id,
        fileName: file.name,
        storedName,
        url,
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
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
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) return NextResponse.json({ error: "attachmentId requis" }, { status: 400 });

    const attachment = await prisma.prospectAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

    await deleteFile(attachment.url);
    await prisma.prospectAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
