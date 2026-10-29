import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatEuro, getBuybackStatusIcon, getBuybackStatusLabel } from "@/lib/buyback";
import { sendBuybackDecisionAdminEmail, sendBuybackStatusEmail } from "@/lib/buyback-email";

/** Réponse du client à une contre-offre, depuis son portail. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { decision } = await request.json().catch(() => ({ decision: null }));
  if (decision !== "accept" && decision !== "refuse") {
    return NextResponse.json({ error: "Réponse invalide" }, { status: 400 });
  }

  const existing = await prisma.buyback.findUnique({ where: { token } });
  if (!existing) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  if (existing.status !== "COUNTER_OFFER" || existing.counterOfferStatus !== "PENDING" || existing.counterOfferAmount == null) {
    return NextResponse.json({ error: "Aucune offre en attente de réponse" }, { status: 409 });
  }

  const accept = decision === "accept";
  const status = accept ? "VALIDATED" : "OFFER_REFUSED";
  const [buyback] = await prisma.$transaction([
    prisma.buyback.update({
      where: { id: existing.id },
      data: {
        counterOfferStatus: accept ? "ACCEPTED" : "REFUSED",
        status,
        ...(accept ? { finalAmount: existing.counterOfferAmount } : {}),
      },
    }),
    prisma.buybackStatusChange.create({ data: { buybackId: existing.id, userId: null, fromStatus: existing.status, toStatus: status } }),
    prisma.buybackNote.create({
      data: {
        buybackId: existing.id,
        content: accept
          ? `Le client a accepté la nouvelle offre de ${formatEuro(existing.counterOfferAmount)}.`
          : "Le client a refusé la nouvelle offre : Mac à lui rendre.",
        isInternal: true,
      },
    }),
  ]);

  after(async () => {
    await sendBuybackStatusEmail(
      buyback,
      getBuybackStatusLabel(status, buyback.dropOffMode),
      getBuybackStatusIcon(status, buyback.dropOffMode),
    );
    await sendBuybackDecisionAdminEmail(buyback, accept);
  });

  return NextResponse.json({ status: buyback.status, counterOfferStatus: buyback.counterOfferStatus, finalAmount: buyback.finalAmount });
}
