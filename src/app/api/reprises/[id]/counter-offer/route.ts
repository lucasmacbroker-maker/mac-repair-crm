import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatEuro } from "@/lib/buyback";
import { buybackPortalUrl, sendBuybackCounterOfferEmail } from "@/lib/buyback-email";
import { sendSMS } from "@/lib/sms";

/** Propose une nouvelle offre au client après contrôle. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { amount, reason } = await request.json();

  if (typeof amount !== "number" || !(amount >= 0)) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  const existing = await prisma.buyback.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  if (["PAID", "RETURNED", "CANCELLED"].includes(existing.status)) {
    return NextResponse.json({ error: "Reprise déjà clôturée" }, { status: 400 });
  }

  const [buyback] = await prisma.$transaction([
    prisma.buyback.update({
      where: { id },
      data: {
        counterOfferAmount: amount,
        counterOfferReason: typeof reason === "string" ? reason.trim().slice(0, 500) : "",
        counterOfferStatus: "PENDING",
        status: "COUNTER_OFFER",
      },
    }),
    prisma.buybackStatusChange.create({ data: { buybackId: id, userId: user.id, fromStatus: existing.status, toStatus: "COUNTER_OFFER" } }),
  ]);

  after(async () => {
    await sendBuybackCounterOfferEmail(buyback);
    if (buyback.clientPhone) {
      sendSMS(
        buyback.clientPhone,
        `Mac Place — Nouvelle offre de ${formatEuro(amount)} pour votre reprise ${buyback.reference}. Répondez ici : ${buybackPortalUrl(buyback.token)} (Ne pas répondre)`,
      ).catch((e) => console.error("[BUYBACK SMS] échec :", e));
    }
  });

  const { ibanEncrypted, ...safe } = buyback;
  return NextResponse.json({ ...safe, hasIban: Boolean(ibanEncrypted) });
}
