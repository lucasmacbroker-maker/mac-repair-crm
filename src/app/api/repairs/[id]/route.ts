import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { after } from "next/server";
import { sendLinkNotificationEmail } from "@/lib/email";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    const repair = await prisma.repair.findUnique({
      where: { id },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        statusChanges: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        partsUsed: {
          include: {
            part: true,
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!repair) {
      return NextResponse.json(
        { error: "Réparation introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Get repair error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();

    const existing = await prisma.repair.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Réparation introuvable" },
        { status: 404 }
      );
    }

    // Build update data, only including fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    const allowedFields = [
      "clientFirstName",
      "clientLastName",
      "clientEmail",
      "clientPhone",
      "clientAddress",
      "clientCity",
      "clientPostalCode",
      "macModel",
      "serialNumber",
      "faultType",
      "faultDescription",
      "repairType",
      "priority",
      "inboundTracking",
      "outboundTracking",
      "carrier",
      "trackingLink",
      "paymentLink",
      "estimatedCost",
      "finalCost",
      "technicianId",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (body.estimatedReturn !== undefined) {
      data.estimatedReturn = body.estimatedReturn
        ? new Date(body.estimatedReturn)
        : null;
    }

    const repair = await prisma.repair.update({
      where: { id },
      data,
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
    });

    // Notify client when a tracking or payment link is added/changed
    const clientName = `${repair.clientFirstName} ${repair.clientLastName}`;

    const trackingLinkChanged =
      body.trackingLink && body.trackingLink !== existing.trackingLink;
    const paymentLinkChanged =
      body.paymentLink && body.paymentLink !== existing.paymentLink;

    if (trackingLinkChanged || paymentLinkChanged) {
      after(async () => {
        if (trackingLinkChanged) {
          try {
            await sendLinkNotificationEmail(
              repair.clientEmail, clientName, repair.token, repair.macModel,
              "tracking", body.trackingLink
            );
          } catch (err) {
            console.error("Failed to send tracking link email:", err);
          }
        }
        if (paymentLinkChanged) {
          try {
            await sendLinkNotificationEmail(
              repair.clientEmail, clientName, repair.token, repair.macModel,
              "payment", body.paymentLink
            );
          } catch (err) {
            console.error("Failed to send payment link email:", err);
          }
        }
      });
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Update repair error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.repair.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Réparation introuvable" },
        { status: 404 }
      );
    }

    await prisma.repair.delete({ where: { id } });

    return NextResponse.json({ message: "Réparation supprimée" });
  } catch (error) {
    console.error("Delete repair error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
