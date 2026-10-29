import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Données publiques d'une reprise pour le portail client (sans IBAN ni notes internes). */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const buyback = await prisma.buyback.findUnique({
    where: { token },
    select: {
      reference: true,
      clientFirstName: true,
      macModel: true,
      configuration: true,
      configManual: true,
      condition: true,
      fault: true,
      serialNumber: true,
      offerAmount: true,
      counterOfferAmount: true,
      counterOfferReason: true,
      counterOfferStatus: true,
      finalAmount: true,
      dropOffMode: true,
      requestedDate: true,
      requestedSlot: true,
      appointmentDate: true,
      inboundTracking: true,
      carrier: true,
      trackingLink: true,
      labelUrl: true,
      ibanLast4: true,
      status: true,
      receivedAt: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      notes: { where: { isInternal: false }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      statusChanges: { select: { id: true, toStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!buyback) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  return NextResponse.json(buyback, { headers: { "Cache-Control": "no-store" } });
}
