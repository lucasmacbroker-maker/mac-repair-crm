import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { after } from "next/server";
import { sendTrackingEmail, sendNewRepairNotification, sendAppointmentConfirmationEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status");
    const repairType = searchParams.get("repairType");
    const technicianId = searchParams.get("technicianId");
    const faultType = searchParams.get("faultType");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (repairType) {
      where.repairType = repairType;
    }
    if (technicianId) {
      where.technicianId = technicianId;
    }
    if (faultType) {
      where.faultType = faultType;
    }
    if (search) {
      where.OR = [
        { clientFirstName: { contains: search } },
        { clientLastName: { contains: search } },
        { clientEmail: { contains: search } },
        { clientPhone: { contains: search } },
        { serialNumber: { contains: search } },
        { token: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
      }
    }

    const skip = (page - 1) * limit;

    const [repairs, total] = await Promise.all([
      prisma.repair.findMany({
        where,
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
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.repair.count({ where }),
    ]);

    return NextResponse.json({
      repairs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List repairs error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    const {
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      clientAddress,
      clientCity,
      clientPostalCode,
      macModel,
      serialNumber,
      faultType,
      faultDescription,
      repairType,
      priority,
      inboundTracking,
      carrier,
      estimatedCost,
      estimatedReturn,
      technicianId,
      appointmentDate,
    } = body;

    if (!clientFirstName || !clientLastName || !clientEmail || !clientPhone) {
      return NextResponse.json(
        { error: "Les informations client sont requises" },
        { status: 400 }
      );
    }

    if (!macModel || !faultType || !repairType) {
      return NextResponse.json(
        { error: "Le modèle, le type de panne et le type de réparation sont requis" },
        { status: 400 }
      );
    }

    if (!["POSTAL", "LOCAL", "HOME"].includes(repairType)) {
      return NextResponse.json(
        { error: "Type de réparation invalide" },
        { status: 400 }
      );
    }

    const token = uuidv4();

    const repair = await prisma.repair.create({
      data: {
        token,
        clientFirstName,
        clientLastName,
        clientEmail,
        clientPhone,
        clientAddress: clientAddress || "",
        clientCity: clientCity || "",
        clientPostalCode: clientPostalCode || "",
        macModel,
        serialNumber: serialNumber || "",
        faultType,
        faultDescription: faultDescription || "",
        repairType,
        status: repairType === "LOCAL" ? "UPCOMING" : "PENDING",
        priority: priority || "NORMAL",
        inboundTracking: inboundTracking || "",
        carrier: carrier || "",
        estimatedCost: estimatedCost || 0,
        estimatedReturn: estimatedReturn ? new Date(estimatedReturn) : null,
        appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
        technicianId: technicianId || null,
        statusChanges: {
          create: {
            fromStatus: "",
            toStatus: repairType === "LOCAL" ? "UPCOMING" : "PENDING",
            userId: user.id,
          },
        },
      },
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

    after(async () => {
      try {
        await sendTrackingEmail(
          clientEmail,
          `${clientFirstName} ${clientLastName}`,
          token,
          macModel
        );
      } catch (err) {
        console.error("Failed to send tracking email:", err);
      }
      try {
        await sendNewRepairNotification(
          `${clientFirstName} ${clientLastName}`,
          macModel,
          faultType,
          repairType,
          repair.id
        );
      } catch (err) {
        console.error("Failed to send admin notification:", err);
      }
      if (appointmentDate && (repairType === "LOCAL" || repairType === "HOME")) {
        const fullClientAddress = [clientAddress, clientPostalCode, clientCity].filter(Boolean).join(", ");
        try {
          await sendAppointmentConfirmationEmail(
            clientEmail,
            `${clientFirstName} ${clientLastName}`,
            token,
            macModel,
            new Date(appointmentDate),
            repairType === "HOME",
            fullClientAddress,
          );
        } catch (err) {
          console.error("Failed to send appointment confirmation:", err);
        }
      }
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (error) {
    console.error("Create repair error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
