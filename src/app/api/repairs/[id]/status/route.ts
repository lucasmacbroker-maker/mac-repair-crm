import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStatusLabel, getStatusIcon } from "@/lib/constants";
import { after } from "next/server";
import { sendStatusUpdateEmail } from "@/lib/email";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Le statut est requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.repair.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Réparation introuvable" },
        { status: 404 }
      );
    }

    if (existing.status === status) {
      return NextResponse.json(
        { error: "Le statut est déjà à cette valeur" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status };

    if (status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    const [repair] = await prisma.$transaction([
      prisma.repair.update({
        where: { id },
        data: updateData,
        include: {
          technician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.statusChange.create({
        data: {
          repairId: id,
          userId: user.id,
          fromStatus: existing.status,
          toStatus: status,
        },
      }),
    ]);

    // Send status update email to client (non-blocking)
    const statusLabel = getStatusLabel(status, existing.repairType);
    const statusIcon = getStatusIcon(status, existing.repairType);

    after(async () => {
      try {
        await sendStatusUpdateEmail(
          existing.clientEmail,
          `${existing.clientFirstName} ${existing.clientLastName}`,
          existing.token,
          existing.macModel,
          statusLabel,
          statusIcon
        );
      } catch (err) {
        console.error("Failed to send status update email:", err);
      }
    });

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
