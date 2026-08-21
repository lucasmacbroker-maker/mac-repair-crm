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
