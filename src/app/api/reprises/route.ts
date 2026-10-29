import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BUYBACK_CLOSED_STATUSES } from "@/lib/buyback";

/** Liste des reprises pour l'administration. L'IBAN n'est jamais renvoyé ici. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(request.url);
  const group = url.searchParams.get("group") || "active";
  const mode = url.searchParams.get("mode") || "";
  const search = (url.searchParams.get("search") || "").trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: group === "closed" ? { in: BUYBACK_CLOSED_STATUSES } : { notIn: BUYBACK_CLOSED_STATUSES },
  };
  if (mode) where.dropOffMode = mode;
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { clientFirstName: { contains: search, mode: "insensitive" } },
      { clientLastName: { contains: search, mode: "insensitive" } },
      { clientEmail: { contains: search, mode: "insensitive" } },
      { macModel: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const buybacks = await prisma.buyback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      reference: true,
      clientFirstName: true,
      clientLastName: true,
      clientPhone: true,
      macModel: true,
      condition: true,
      offerAmount: true,
      counterOfferAmount: true,
      counterOfferStatus: true,
      finalAmount: true,
      dropOffMode: true,
      requestedDate: true,
      requestedSlot: true,
      appointmentDate: true,
      status: true,
      receivedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ buybacks });
}
