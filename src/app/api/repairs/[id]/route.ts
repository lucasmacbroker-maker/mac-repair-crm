import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { after } from "next/server";
import { sendLinkNotificationEmail, sendAppointmentConfirmationEmail, sendQuoteEmail, sendTechnicianAppointmentNotification } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { generateQuotePDF } from "@/lib/quote-pdf";

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
      "location",
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

    if (body.appointmentDate !== undefined) {
      data.appointmentDate = body.appointmentDate
        ? new Date(body.appointmentDate)
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

    const clientName = `${repair.clientFirstName} ${repair.clientLastName}`;

    const trackingLinkChanged =
      body.trackingLink && body.trackingLink !== existing.trackingLink;
    const paymentLinkChanged =
      body.paymentLink && body.paymentLink !== existing.paymentLink;

    // Appointment confirmation: send email + SMS when appointmentDate is set/changed
    const newApptTime = body.appointmentDate ? new Date(body.appointmentDate).getTime() : null;
    const oldApptTime = existing.appointmentDate ? existing.appointmentDate.getTime() : null;
    const appointmentChanged = newApptTime !== null && newApptTime !== oldApptTime;

    // Quote PDF for LOCAL repairs: send when estimatedCost goes from 0/null to a value
    const isLocalRepair = repair.repairType === "LOCAL";
    const estimatedCostAdded =
      isLocalRepair &&
      Number(body.estimatedCost) > 0 &&
      Number(existing.estimatedCost) === 0;

    console.log("[PUT repair] appointmentChanged:", appointmentChanged, "| estimatedCostAdded:", estimatedCostAdded, "| repairType:", repair.repairType);

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

      if (appointmentChanged && repair.appointmentDate) {
        const isHome = repair.repairType === "HOME";
        const repairLocation = repair.location || "PARIS";
        const ADDRESSES: Record<string, string> = {
          PARIS: "39 rue Edouard Vaillant, 94140 Alfortville",
          NICE: "12 rue François de Paule, 06300 Nice",
        };
        const atelierAddr = ADDRESSES[repairLocation] || ADDRESSES.PARIS;
        const fullClientAddress = [repair.clientAddress, repair.clientPostalCode, repair.clientCity].filter(Boolean).join(", ");
        const apptDate = repair.appointmentDate;

        const dateStr = apptDate.toLocaleDateString("fr-FR", {
          weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Paris",
        });
        const timeStr = apptDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
        });

        try {
          await sendAppointmentConfirmationEmail(
            repair.clientEmail, clientName, repair.token, repair.macModel,
            apptDate, isHome,
            isHome ? fullClientAddress : atelierAddr,
            repairLocation,
          );
        } catch (err) {
          console.error("Failed to send appointment confirmation email:", err);
        }

        // Notify Nice technician (Antoine) when appointment changes
        if (repairLocation === "NICE") {
          try {
            await sendTechnicianAppointmentNotification(
              "macbrokeridf@gmail.com",
              clientName, repair.clientPhone || "", repair.macModel,
              repair.faultType, repair.faultDescription || "",
              apptDate, repair.id, isHome, fullClientAddress,
            );
          } catch (err) {
            console.error("Failed to send technician notification:", err);
          }
        }

        if (repair.clientPhone) {
          const locationSMS = isHome
            ? `Notre technicien se déplacera à votre adresse.`
            : `Adresse atelier : ${atelierAddr}`;
          const smsBody = `Mac Place — RDV confirmé pour votre ${repair.macModel} le ${dateStr} à ${timeStr}. ${locationSMS} Répondez STOP pour vous désinscrire.`;
          try {
            await sendSMS(repair.clientPhone, smsBody);
          } catch (err) {
            console.error("Failed to send appointment SMS:", err);
          }
        }
      }

      if (estimatedCostAdded) {
        try {
          const pdfBuffer = await generateQuotePDF({
            id: repair.id,
            clientFirstName: repair.clientFirstName,
            clientLastName: repair.clientLastName,
            clientEmail: repair.clientEmail,
            clientPhone: repair.clientPhone || "",
            clientAddress: repair.clientAddress || undefined,
            clientCity: repair.clientCity || undefined,
            clientPostalCode: repair.clientPostalCode || undefined,
            macModel: repair.macModel,
            serialNumber: repair.serialNumber || undefined,
            faultType: repair.faultType,
            faultDescription: repair.faultDescription || undefined,
            estimatedCost: body.estimatedCost,
            createdAt: repair.createdAt,
            token: repair.token,
          });
          await sendQuoteEmail(
            repair.clientEmail, clientName, repair.token, repair.macModel,
            body.estimatedCost, pdfBuffer
          );
        } catch (err) {
          console.error("Failed to send quote PDF email:", err);
        }
      }
    });

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
