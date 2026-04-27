import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendQuoteValidatedEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const repair = await prisma.repair.findUnique({
      where: { token },
      include: {
        attachments: {
          where: { type: "Devis" },
        },
      },
    });

    if (!repair) {
      return NextResponse.json(
        { error: "Reparation introuvable" },
        { status: 404 }
      );
    }

    if (repair.quoteValidated) {
      return NextResponse.json(
        { error: "Le devis a deja ete valide" },
        { status: 400 }
      );
    }

    if (repair.attachments.length === 0) {
      return NextResponse.json(
        { error: "Aucun devis disponible a valider" },
        { status: 400 }
      );
    }

    const updated = await prisma.repair.update({
      where: { id: repair.id },
      data: {
        quoteValidated: true,
        quoteValidatedAt: new Date(),
      },
    });

    after(async () => {
      try {
        await sendQuoteValidatedEmail(
          repair.clientEmail,
          `${repair.clientFirstName} ${repair.clientLastName}`,
          repair.macModel,
          repair.id
        );
      } catch (err) {
        console.error("Failed to send quote validation email:", err);
      }
    });

    return NextResponse.json({
      message: "Devis valide avec succes",
      quoteValidated: updated.quoteValidated,
      quoteValidatedAt: updated.quoteValidatedAt,
    });
  } catch (error) {
    console.error("Validate quote error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
