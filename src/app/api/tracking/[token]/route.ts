import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const repair = await prisma.repair.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        clientFirstName: true,
        clientLastName: true,
        macModel: true,
        serialNumber: true,
        faultType: true,
        faultDescription: true,
        repairType: true,
        status: true,
        priority: true,
        inboundTracking: true,
        outboundTracking: true,
        carrier: true,
        trackingLink: true,
        paymentLink: true,
        estimatedCost: true,
        estimatedReturn: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        quoteValidated: true,
        quoteValidatedAt: true,
        appointmentDate: true,
        notes: {
          where: { isInternal: false },
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        statusChanges: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            type: true,
            createdAt: true,
          },
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
    console.error("Tracking error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
