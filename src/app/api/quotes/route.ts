import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { after } from "next/server";
import { generateQuotePDF } from "@/lib/quote-pdf";
import { sendQuoteEmail } from "@/lib/email";

interface QuoteLine {
  description: string;
  faultType?: string;
  amountTTC: number;
}

function totalHTfromLines(lines: QuoteLine[]): number {
  const ttc = lines.reduce((s, l) => s + (l.amountTTC || 0), 0);
  return Math.round((ttc / 1.2) * 100) / 100;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { clientFirstName: { contains: search } },
        { clientLastName: { contains: search } },
        { clientEmail: { contains: search } },
        { clientPhone: { contains: search } },
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({ quotes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("List quotes error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const {
      clientFirstName, clientLastName, clientCompany, clientEmail, clientPhone,
      clientAddress, clientCity, clientPostalCode,
      macModel, serialNumber,
      lines = [],
      notes, validUntil, location, sendNow,
    } = body;

    if (!clientFirstName || !clientLastName || !clientEmail || !clientPhone || !macModel) {
      return NextResponse.json({ error: "Informations client et modèle Mac requis" }, { status: 400 });
    }

    const typedLines: QuoteLine[] = Array.isArray(lines) ? lines : [];
    const estimatedCost = totalHTfromLines(typedLines);
    const totalTTC = typedLines.reduce((s, l) => s + (l.amountTTC || 0), 0);

    const quote = await prisma.quote.create({
      data: {
        clientFirstName,
        clientLastName,
        clientCompany: clientCompany || "",
        clientEmail,
        clientPhone,
        clientAddress: clientAddress || "",
        clientCity: clientCity || "",
        clientPostalCode: clientPostalCode || "",
        macModel,
        serialNumber: serialNumber || "",
        faultType: typedLines[0]?.faultType || "",
        faultDescription: typedLines.map(l => l.description).filter(Boolean).join(" / "),
        estimatedCost,
        lines: typedLines as object[],
        notes: notes || "",
        validUntil: validUntil ? new Date(validUntil) : null,
        location: location || "PARIS",
        status: sendNow ? "SENT" : "DRAFT",
        sentAt: sendNow ? new Date() : null,
        createdById: user.id,
      },
    });

    if (sendNow) {
      after(async () => {
        try {
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
            faultType: typedLines[0]?.faultType || "Devis",
            faultDescription: typedLines.map(l => l.description).filter(Boolean).join(" / "),
            estimatedCost,
            createdAt: quote.createdAt,
            token: quote.token,
          });
          const clientName = `${quote.clientFirstName} ${quote.clientLastName}`;
          await sendQuoteEmail(quote.clientEmail, clientName, quote.token, quote.macModel, totalTTC, pdf, undefined, false, "", quote.location);
        } catch (err) {
          console.error("Failed to send quote email:", err);
        }
      });
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Create quote error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
