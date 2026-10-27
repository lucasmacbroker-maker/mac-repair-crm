import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendMacBookPromoEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { clientEmails, macbookIds, customMessage } = await request.json();
    if (!clientEmails?.length || !macbookIds?.length) {
      return NextResponse.json({ error: "Clients et MacBooks requis" }, { status: 400 });
    }

    const macbooks = await prisma.macBookForSale.findMany({ where: { id: { in: macbookIds } } });

    const promoItems = macbooks.map(m => ({
      model: m.model,
      year: m.year,
      specs: m.specs,
      condition: m.condition,
      originalPrice: m.originalPrice,
      promoPrice: m.promoPrice,
      photos: Array.isArray(m.photos) ? (m.photos as string[]) : [],
    }));

    // Also look up names for a personalised greeting (fallback to email prefix)
    const dbClients = await prisma.client.findMany({ where: { email: { in: clientEmails } } });
    const nameMap = new Map(dbClients.map(c => [c.email.toLowerCase(), c.name]));

    let sent = 0;
    let failed = 0;
    for (const email of clientEmails as string[]) {
      const name = nameMap.get(email.toLowerCase()) || email.split("@")[0];
      const ok = await sendMacBookPromoEmail(email, name, promoItems, customMessage);
      console.log(`Promo MacBook → ${email}: ${ok ? "OK" : "FAILED"}`);
      if (ok) sent++; else failed++;
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("Promo send error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
