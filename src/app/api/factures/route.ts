import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const factures = await prisma.repairAttachment.findMany({
      where: { type: "Facture" },
      include: {
        repair: {
          select: {
            clientFirstName: true,
            clientLastName: true,
            clientEmail: true,
            macModel: true,
            estimatedCost: true,
            finalCost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(factures);
  } catch (error) {
    console.error("Factures fetch error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.repairAttachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Facture delete error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
