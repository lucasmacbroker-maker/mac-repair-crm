import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateQuotePDF } from "@/lib/quote-pdf";
import { sendQuoteEmail } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

    const storedLines = Array.isArray(quote.lines) ? quote.lines as { description: string; faultType?: string; amountTTC: number }[] : [];
    const hasLines = storedLines.length > 0;
    const totalTTC = hasLines ? Math.round(quote.estimatedCost * 1.2 * 100) / 100 : quote.estimatedCost;

    const pdf = await generateQuotePDF({
      id: quote.id,
      clientFirstName: quote.clientFirstName,
      clientLastName: quote.clientLastName,
      clientEmail: quote.clientEmail,
      clientPhone: quote.clientPhone,
      clientAddress: quote.clientAddress,
      clientCity: quote.clientCity,
      clientPostalCode: quote.clientPostalCode,
      macModel: quote.macModel,
      serialNumber: quote.serialNumber,
      faultType: quote.faultType || "Devis",
      faultDescription: quote.faultDescription,
      estimatedCost: quote.estimatedCost,
      lines: storedLines,
      createdAt: quote.createdAt,
      token: quote.token,
    });

    const clientName = `${quote.clientFirstName} ${quote.clientLastName}`;
    await sendQuoteEmail(quote.clientEmail, clientName, quote.token, quote.macModel, totalTTC, pdf, undefined, false, "", quote.location);

    const updated = await prisma.quote.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Send quote error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
