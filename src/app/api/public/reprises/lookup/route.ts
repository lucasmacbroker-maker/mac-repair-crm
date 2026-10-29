import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidBuybackApiKey } from "@/lib/buyback-server";
import { buybackPortalUrl } from "@/lib/buyback-email";

/**
 * Retrouve le lien de suivi d'une reprise à partir de sa référence et de l'e-mail du client.
 * Utilisé par la page « Suivre ma reprise » du site de reprise (appel serveur, clé partagée).
 */
export async function GET(request: Request) {
  if (!isValidBuybackApiKey(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(request.url);
  const reference = (url.searchParams.get("reference") || "").trim().toUpperCase();
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!reference || !email) return NextResponse.json({ error: "Référence et e-mail requis" }, { status: 400 });

  const buyback = await prisma.buyback.findUnique({ where: { reference }, select: { token: true, clientEmail: true } });
  if (!buyback || buyback.clientEmail.toLowerCase() !== email) {
    return NextResponse.json({ error: "Aucune reprise ne correspond à ces informations" }, { status: 404 });
  }
  return NextResponse.json({ portalUrl: buybackPortalUrl(buyback.token) });
}
