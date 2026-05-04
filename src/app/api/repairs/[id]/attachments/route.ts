import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  validateFileType,
  validateFileSize,
  validateAttachmentType,
  saveFile,
} from "@/lib/attachments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { id } = await params;

    const repair = await prisma.repair.findUnique({ where: { id } });
    if (!repair) {
      return NextResponse.json({ error: "Reparation introuvable" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (!type || !validateAttachmentType(type)) {
      return NextResponse.json(
        { error: "Type de document invalide (Devis, Facture, Photo, Autre)" },
        { status: 400 }
      );
    }
    if (!validateFileType(file.type)) {
      return NextResponse.json(
        { error: "Format non autorise (PDF, PNG, JPG uniquement)" },
        { status: 400 }
      );
    }
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (10 Mo maximum)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storedName, url } = await saveFile(buffer, file.type);

    const attachment = await prisma.repairAttachment.create({
      data: {
        repairId: id,
        fileName: file.name,
        storedName,
        url,
        mimeType: file.type,
        size: file.size,
        type,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Upload attachment error:", msg);
    return NextResponse.json(
      { error: `Erreur upload: ${msg}` },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { id } = await params;

    const attachments = await prisma.repairAttachment.findMany({
      where: { repairId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("List attachments error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
