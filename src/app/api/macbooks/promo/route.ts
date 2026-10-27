import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendMacBookPromoEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { clientContacts, macbookIds, customMessage } = await request.json();
    if (!clientContacts?.length || !macbookIds?.length) {
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

    let sent = 0;
    let failed = 0;
    for (const contact of clientContacts as { email: string; name: string }[]) {
      const ok = await sendMacBookPromoEmail(contact.email, contact.name, promoItems, customMessage);
      console.log(`Promo MacBook → ${contact.email}: ${ok ? "OK" : "FAILED"}`);
      if (ok) sent++; else failed++;
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("Promo send error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
