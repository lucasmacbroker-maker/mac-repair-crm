import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatEuro, getBuybackStatuses, getBuybackStatusIcon, getBuybackStatusLabel } from "@/lib/buyback";
import { appointmentHtml, buybackPortalUrl, sendBuybackStatusEmail } from "@/lib/buyback-email";
import { sendSMS } from "@/lib/sms";

const p = (html: string) => `<p style="color: #424245; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">${html}</p>`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { status, notify = true } = await request.json();

  const existing = await prisma.buyback.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  if (!getBuybackStatuses(existing.dropOffMode).some((s) => s.key === status)) {
    return NextResponse.json({ error: "Statut inconnu" }, { status: 400 });
  }
  if (existing.status === status) return NextResponse.json({ error: "Le statut est déjà à cette valeur" }, { status: 400 });

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { status };
  if (status === "RECEIVED" && !existing.receivedAt) data.receivedAt = now;
  const agreed =
    existing.counterOfferStatus === "ACCEPTED" && existing.counterOfferAmount != null ? existing.counterOfferAmount : existing.offerAmount;
  if ((status === "VALIDATED" || status === "PAID") && !(existing.finalAmount > 0)) data.finalAmount = agreed;
  if (status === "PAID") {
    data.paidAt = now;
    data.closedAt = now;
  }
  if (status === "RETURNED" || status === "CANCELLED") data.closedAt = now;

  const [buyback] = await prisma.$transaction([
    prisma.buyback.update({ where: { id }, data }),
    prisma.buybackStatusChange.create({ data: { buybackId: id, userId: user.id, fromStatus: existing.status, toStatus: status } }),
  ]);

  if (notify) {
    after(async () => {
      const label = getBuybackStatusLabel(status, buyback.dropOffMode);
      const icon = getBuybackStatusIcon(status, buyback.dropOffMode);
      let extra = "";
      if (status === "LABEL_SENT") {
        extra = p("Votre bordereau prépayé vous a été envoyé. Collez-le sur un carton rigide contenant votre Mac (effacé et déconnecté d'iCloud) et déposez-le en point relais.");
        if (/^https?:\/\//i.test(buyback.labelUrl)) extra += p(`<a href="${esc(buyback.labelUrl)}" style="color: #1f67e7;">Télécharger mon bordereau</a>`);
        if (buyback.inboundTracking) extra += p(`Numéro de suivi : <strong>${esc(buyback.inboundTracking)}</strong>${buyback.carrier ? ` (${esc(buyback.carrier)})` : ""}`);
      }
      if (status === "APPOINTMENT" && buyback.appointmentDate) extra = appointmentHtml(buyback.appointmentDate);
      if (status === "RECEIVED") extra = p("Nos techniciens vont contrôler votre Mac. Le virement part au plus tard 48 h après sa réception.");
      if (status === "PAID") extra = p(`Le virement de <strong>${formatEuro(buyback.finalAmount)}</strong> est parti sur votre compte. Merci pour votre confiance !`);
      await sendBuybackStatusEmail(buyback, label, icon, extra);
      if (buyback.clientPhone) {
        sendSMS(
          buyback.clientPhone,
          `Mac Place — Reprise ${buyback.reference} : ${icon} ${label}. Suivi : ${buybackPortalUrl(buyback.token)} (Ne pas répondre)`,
        ).catch((e) => console.error("[BUYBACK SMS] échec :", e));
      }
    });
  }

  const { ibanEncrypted, ...safe } = buyback;
  return NextResponse.json({ ...safe, hasIban: Boolean(ibanEncrypted) });
}
