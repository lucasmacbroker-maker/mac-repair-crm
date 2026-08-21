import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendReturnShipmentEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const formData = await request.formData();
    const bordereauFile = formData.get("bordereau") as File | null;
    const returnTrackingUrl = (formData.get("trackingUrl") as string | null)?.trim();

    if (!bordereauFile) {
      return NextResponse.json({ error: "Bordereau manquant" }, { status: 400 });
    }
    if (!returnTrackingUrl) {
      return NextResponse.json({ error: "Lien de suivi manquant" }, { status: 400 });
    }

    const repair = await prisma.repair.findUnique({ where: { id } });
    if (!repair) {
      return NextResponse.json({ error: "Réparation introuvable" }, { status: 404 });
    }

    // Update trackingLink so suivi page shows return tracking automatically
    await prisma.repair.update({
      where: { id },
      data: { trackingLink: returnTrackingUrl },
    });

    // Send email to client with bordereau attached
    const bordereauBuffer = Buffer.from(await bordereauFile.arrayBuffer());
    const clientName = `${repair.clientFirstName} ${repair.clientLastName}`;
    await sendReturnShipmentEmail(
      repair.clientEmail,
      clientName,
      repair.token,
      repair.macModel,
      returnTrackingUrl,
      bordereauBuffer,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-return error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
