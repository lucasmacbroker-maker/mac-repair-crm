import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/buyback-server";

/** Déchiffre l'IBAN pour préparer le virement. Réservé aux utilisateurs connectés. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const buyback = await prisma.buyback.findUnique({ where: { id }, select: { ibanEncrypted: true, accountHolder: true, reference: true } });
  if (!buyback?.ibanEncrypted) return NextResponse.json({ error: "Aucun IBAN enregistré" }, { status: 404 });

  try {
    const iban = decryptSecret(buyback.ibanEncrypted);
    console.info(`[BUYBACK] IBAN de ${buyback.reference} consulté par ${user.email}`);
    return NextResponse.json({ iban: iban.replace(/(.{4})/g, "$1 ").trim(), accountHolder: buyback.accountHolder });
  } catch (e) {
    console.error("[BUYBACK] déchiffrement IBAN impossible :", e);
    return NextResponse.json({ error: "Déchiffrement impossible (clé BUYBACK_ENCRYPTION_KEY ?)" }, { status: 500 });
  }
}
