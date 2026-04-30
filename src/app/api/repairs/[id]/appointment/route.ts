import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { after } from "next/server";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    const repair = await prisma.repair.findUnique({ where: { id } });
    if (!repair) {
      return NextResponse.json({ error: "Réparation introuvable" }, { status: 404 });
    }

    if (!repair.appointmentDate) {
      return NextResponse.json(
        { error: "Aucun rendez-vous planifié pour cette réparation" },
        { status: 400 }
      );
    }

    const clientName = `${repair.clientFirstName} ${repair.clientLastName}`;

    after(async () => {
      try {
        await sendAppointmentConfirmationEmail(
          repair.clientEmail,
          clientName,
          repair.token,
          repair.macModel,
          repair.appointmentDate!,
        );
      } catch (err) {
        console.error("Failed to send appointment confirmation:", err);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send appointment confirmation error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
